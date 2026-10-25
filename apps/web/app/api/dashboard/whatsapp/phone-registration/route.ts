import {whatsappManagementAccess} from "../../../../lib/whatsapp/management-access";
import { NextResponse } from "next/server";
import { getOwnedBusinessForApiWrite } from "../../../../lib/ownership";
import { db } from "../../../../lib/db";
import { readBoundedJson } from "../../../../lib/request-body";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";
import { getMetaWhatsAppConfig } from "../../../../lib/whatsapp/meta-config";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "../../../../lib/whatsapp/credential-envelope";
import { inspectRegistration, registerPhone, PhoneRegistrationError } from "../../../../lib/whatsapp/phone-registration-provider";
import { writeWhatsAppAuditLog } from "../../../../lib/whatsapp/audit";
export const maxDuration = 60;
const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: Request) {
  try {
    // Browser-only mutation: reject absent/cross-origin requests before reading credentials.
    // Next.js may normalize the internal URL host (e.g. 127.0.0.1 to localhost).
    // Match the browser's immutable Host header, not that internal hostname.
    const requestOrigin = `${new URL(request.url).protocol}//${request.headers.get("host")}`;
    if (request.headers.get("origin") !== requestOrigin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ ok: false, error: "يجب تنفيذ الطلب من لوحة التحكم نفسها." }, 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ ok: false, error: "طلب غير صالح." }, 415);
    const business = await getOwnedBusinessForApiWrite(); // No section argument: owner only, never delegated staff.
    if (!business) return reply({ ok: false, error: "هذه الخطوة متاحة لمالك المنشأة فقط." }, 403);
    const verifiedOwner = await db.user.findFirst({ where: { id: business.ownerId, deletedAt: null, emailVerifiedAt: { not: null } }, select: { id: true } });
    if (!verifiedOwner) return reply({ ok: false, error: "أكد بريد حساب المالك أولًا." }, 403);
    if(!(await whatsappManagementAccess(business.id)).allowed)return reply({ok:false,error:"يلزم اشتراك يتيح إشعارات واتساب أو التسويق."},403);
    const body = await readBoundedJson(request, 2048) as Record<string, unknown>;
    if (!body || typeof body.connectionId !== "string" || !["check", "register"].includes(String(body.operation))) return reply({ ok: false, error: "طلب غير صالح." }, 400);
    const connection = await db.whatsAppConnection.findFirst({ where: { id: body.connectionId, businessId: business.id, provider: "meta", status: "connected", disabledAt: null, OR:[{bookingEnabled:true},{marketingEnabled:true}] } });
    if (!connection) return reply({ ok: false, error: "رقم واتساب لم يعد مرتبطًا بهذه المنشأة." }, 409);
    if (body.operation === "register" && (body.confirm !== true || typeof body.pin !== "string" || !/^\d{6}$/.test(body.pin))) return reply({ ok: false, error: "أدخل PIN من ستة أرقام وأكد تسجيل الرقم." }, 400);
    const limit = await consumePublicWriteLimit({ businessId: business.id, identity: connection.id, scope: `whatsapp-phone-${body.operation}`, limit: body.operation === "register" ? 1 : 10, windowSeconds: 60 });
    if (!limit.allowed) return reply({ ok: false, error: "انتظر دقيقة قبل إعادة المحاولة." }, 429);
    const config = getMetaWhatsAppConfig();
    const token = decryptWhatsAppCredential({ envelope: connection.credentialEnvelope as unknown as WhatsAppCredentialEnvelope, encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: business.id });
    const input = { token, version: config.META_WHATSAPP_GRAPH_VERSION, wabaId: connection.wabaId, phoneNumberId: connection.phoneNumberId };
    try {
      const state = body.operation === "check" ? await inspectRegistration(input) : await registerPhone({ ...input, pin: body.pin as string });
      if (body.operation === "register") await writeWhatsAppAuditLog({ businessId: business.id, actorUserId: business.ownerId, action: "connection.phone.register", targetType: "connection", targetId: connection.id, outcome: "success" });
      return reply({ ok: true, state });
    } catch (error) {
      const reason = error instanceof PhoneRegistrationError ? error.reason : "read_failed";
      const diagnostic = error instanceof PhoneRegistrationError ? error.diagnostic : {};
      if (body.operation === "register") await writeWhatsAppAuditLog({ businessId: business.id, actorUserId: business.ownerId, action: "connection.phone.register", targetType: "connection", targetId: connection.id, outcome: "failed", metadata: { reason, ...diagnostic } });
      const errors: Record<string, string> = {
        account_linking_pending: "رفضت Meta تسجيل الرقم بسبب ربط الحساب أو مراجعته (100). راجع حالة حساب واتساب لدى Meta قبل تكرار التسجيل.",
        registration_permission_missing: "رفضت Meta التسجيل بسبب نقص صلاحية التفويض (100). حدّث الربط الرسمي بحساب يملك صلاحية إدارة هذا الرقم.",
        display_name_pending: "أفادت Meta بأن اسم العرض يحتاج إكمال الاعتماد قبل التسجيل (100).",
        registration_pin_required: "أفادت Meta بأن PIN مطلوب في طلب التسجيل (100). لم نعد المحاولة تلقائيًا؛ يلزم مراجعة طلب التسجيل.",
        phone_not_verified: "أكمل إثبات ملكية رقم الهاتف داخل ربط Meta أولًا، ثم تحقق من الحالة هنا.",
        requires_meta_onboarding: "يحتاج هذا الرقم إلى إكمال خطوات Meta الرسمية. لم نغيّر تسجيله أو نفصله عن تطبيق واتساب.",
        asset_mismatch: "لم تؤكد Meta أن الرقم يتبع حساب واتساب المرتبط. حدّث الربط الرسمي.",
        registration_uncertain: "لم يتأكد رد التسجيل. اضغط «فحص حالة الرقم» قبل أي محاولة جديدة.",
      };
      const message = errors[reason] ?? (/^meta_\d{1,10}$/.test(reason) ? `تعذرت العملية لدى Meta. رمز الخطأ: ${reason.slice(5)}. لم نعد المحاولة تلقائيًا.` : "تعذر التحقق من تسجيل الرقم الآن. حاول لاحقًا.");
      const reference = [diagnostic.subcode !== undefined ? `الرمز الفرعي: ${diagnostic.subcode}` : "", diagnostic.traceId ? `مرجع طلب Meta: ${diagnostic.traceId}` : ""].filter(Boolean).join(" · ");
      return reply({ ok: false, error: reference ? `${message} ${reference}` : message }, 409);
    }
  } catch { return reply({ ok: false, error: "تعذر إكمال العملية الآن." }, 503); }
}
