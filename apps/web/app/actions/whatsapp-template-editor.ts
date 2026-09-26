"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "../lib/whatsapp/credential-envelope";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl } from "../lib/whatsapp/meta-config";
import { buildTemplateSubmission } from "../lib/whatsapp/template-editor-domain";
import { syncMetaWhatsAppTemplates } from "../lib/whatsapp/template-sync";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";
import { consumePublicWriteLimit } from "../lib/rate-limit";

export async function submitWhatsAppTemplateAction(_previous: { message: string }, form: FormData): Promise<{ message: string }> {
  const context = await getWhatsAppWriteContext("campaign.manage");
  if (!context || !await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return { message: "لا تملك صلاحية إدارة القوالب أو الاشتراك غير فعال." };
  const connectionId = String(form.get("connectionId") ?? "");
  const connection = await db.whatsAppConnection.findFirst({ where: { id: connectionId, businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true }, select: { wabaId: true, credentialEnvelope: true } });
  if (!connection) return { message: "اربط رقم المنشأة الرسمي أولًا." };
  const rate = await consumePublicWriteLimit({ scope: "whatsapp-template-submit", businessId: context.businessId, identity: context.userId, limit: 10, windowSeconds: 3600 });
  if (!rate.allowed) return { message: "وصلت إلى حد محاولات تعديل القوالب. حاول لاحقًا." };
  const get = (key: string) => String(form.get(key) ?? "").trim();
  let accepted = false;
  try {
    const config = getMetaWhatsAppConfig();
    const token = decryptWhatsAppCredential({ envelope: connection.credentialEnvelope as unknown as WhatsAppCredentialEnvelope, encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: context.businessId });
    const headers = { authorization: `Bearer ${token}` };
    const input = { name: get("name"), language: get("language"), category: get("category"), body: get("body"), footer: get("footer"), header: get("header"), examples: get("examples"), buttonText: get("buttonText"), buttonUrl: get("buttonUrl"), mediaHandle: "" };
    // Validate text before any provider mutation. The sample handle is validated below.
    buildTemplateSubmission({ ...input, mediaHandle: "validated-later" });
    const templateId = get("templateId");
    const template = templateId ? await db.whatsAppTemplate.findFirst({ where: { id: templateId, businessId: context.businessId, connectionId, provider: "meta" }, select: { providerTemplateId: true, name: true, language: true } }) : null;
    if (templateId && (!template || template.name !== input.name || template.language !== input.language)) throw new Error("TEMPLATE_INPUT_INVALID");
    if (input.header !== "NONE") {
      const file = form.get("sample");
      if (!(file instanceof File) || file.size < 1 || file.size > 3 * 1024 * 1024) throw new Error("TEMPLATE_SAMPLE_REQUIRED");
      const allowed = input.header === "IMAGE" ? ["image/jpeg", "image/png"] : input.header === "VIDEO" ? ["video/mp4"] : ["application/pdf"];
      if (!allowed.includes(file.type)) throw new Error("TEMPLATE_SAMPLE_REQUIRED");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const signature = Buffer.from(bytes.subarray(0, 12));
      const valid = file.type === "image/jpeg" ? signature[0] === 255 && signature[1] === 216 && signature[2] === 255 : file.type === "image/png" ? signature.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : file.type === "application/pdf" ? signature.subarray(0, 5).toString() === "%PDF-" : signature.subarray(4, 8).toString() === "ftyp";
      if (!valid) throw new Error("TEMPLATE_SAMPLE_REQUIRED");
      const url = new URL(metaWhatsAppGraphUrl(config, `${config.META_APP_ID}/uploads`));
      url.searchParams.set("file_length", String(file.size)); url.searchParams.set("file_type", file.type);
      const session = await fetch(url, { method: "POST", headers, signal: AbortSignal.timeout(15000) });
      if (!session.ok) throw new Error("META_TEMPLATE_UPLOAD_FAILED");
      const upload = await session.json() as { id?: string };
      if (!upload.id || !/^upload:[A-Za-z0-9_:=.+/-]+(?:\?sig=[A-Za-z0-9_-]+)?$/.test(upload.id) || upload.id.length > 4096) throw new Error("META_TEMPLATE_UPLOAD_FAILED");
      const [sessionPath, signatureQuery] = upload.id.split("?");
      const uploadUrl = new URL(metaWhatsAppGraphUrl(config, sessionPath));
      if (signatureQuery) uploadUrl.searchParams.set("sig", new URLSearchParams(signatureQuery).get("sig")!);
      const uploaded = await fetch(uploadUrl, { method: "POST", redirect: "error", headers: { authorization: `OAuth ${token}`, file_offset: "0", "content-type": file.type }, body: bytes, signal: AbortSignal.timeout(30000) });
      if (!uploaded.ok) throw new Error("META_TEMPLATE_UPLOAD_FAILED");
      const sample = await uploaded.json() as { h?: string };
      if (!sample.h || sample.h.length > 4096) throw new Error("META_TEMPLATE_UPLOAD_FAILED");
      input.mediaHandle = sample.h;
    }
    const payload = buildTemplateSubmission(input);
    if (template) await db.whatsAppTemplate.updateMany({ where: { id: templateId, businessId: context.businessId, connectionId }, data: { status: "pending", providerStatus: "EDIT_REQUESTED" } });
    const response = await fetch(metaWhatsAppGraphUrl(config, template ? template.providerTemplateId : `${connection.wabaId}/message_templates`), { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(template ? { components: payload.components, category: payload.category } : payload), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("META_TEMPLATE_SUBMISSION_REJECTED");
    accepted = true;
    // Stop local launches against an edited template until Meta's new status is synced.
    if (template) await db.whatsAppTemplate.updateMany({ where: { id: templateId, businessId: context.businessId, connectionId }, data: { status: "pending", providerStatus: "PENDING" } });
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: template ? "template.edit" : "template.create", targetType: "connection", targetId: connectionId, outcome: "success" });
    await syncMetaWhatsAppTemplates({ businessId: context.businessId, connectionId });
    revalidatePath("/dashboard/whatsapp/templates");
    return { message: "استلمت Meta الطلب. راقب حالة القالب بعد المزامنة؛ لا يمكن استخدامه للحملات حتى اعتماده." };
  } catch (error) {
    if (accepted) return { message: "استلمت Meta الطلب لكن لم تكتمل المزامنة. اضغط تحديث من Meta ولا تعِد إنشاء القالب." };
    const reason = error instanceof Error ? error.message : "UNKNOWN";
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "template.submit", targetType: "connection", targetId: connectionId, outcome: "failed", metadata: { reason: reason.startsWith("TEMPLATE_") || reason.startsWith("META_TEMPLATE_") ? reason : "UNKNOWN" } }).catch(() => undefined);
    return { message: reason === "TEMPLATE_SAMPLE_REQUIRED" ? "أرفق عينة مطابقة لنوع القالب لا تتجاوز 3 MB." : reason.startsWith("TEMPLATE_") ? "راجع الاسم والنص والمتغيرات وأمثلتها والرابط. يجب ترقيم المتغيرات بالتتابع من {{1}}." : "لم يتأكد قبول الطلب. حدّث القوالب من Meta أولًا للتحقق قبل إعادة المحاولة." };
  }
}
