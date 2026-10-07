"use server";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { readMetaCatalog } from "../lib/whatsapp/meta-catalog";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { buildTemplateSubmission, templateValidationError } from "../lib/whatsapp/template-editor-domain";
import { productCarouselTemplateComponent } from "../lib/whatsapp/product-carousel";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "../lib/whatsapp/credential-envelope";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl } from "../lib/whatsapp/meta-config";
import { persistSubmittedTemplate, submitTemplateRequest, TemplateSubmissionError, submissionErrorMessage } from "../lib/whatsapp/template-submission";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";

async function actor() {
  const context = await getWhatsAppWriteContext("campaign.manage");
  if (!context || !await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) throw new Error("ACCESS_DENIED");
  return context;
}
export async function loadMetaCatalogAction(connectionId: string, catalogId?: string) {
  try {
    const context = await actor();
    if (typeof connectionId !== "string" || connectionId.length > 128 || (catalogId !== undefined && !/^\d{1,128}$/.test(catalogId))) throw new Error("INPUT_INVALID");
    if (!(await consumePublicWriteLimit({ scope: "whatsapp-catalog-read", businessId: context.businessId, identity: context.userId, limit: 30, windowSeconds: 3600 })).allowed) return { error: "وصلت إلى حد قراءة الكتالوج المؤقت. حاول لاحقًا." };
    return await readMetaCatalog({ businessId: context.businessId, connectionId, catalogId });
  } catch { return { error: "تعذرت قراءة كتالوج Meta. تحقق من ربط الكتالوج بحساب واتساب وصلاحيات قراءة المنتجات للاتصال." }; }
}
export async function submitProductCarouselAction(form: FormData) {
  let accepted = false;
  try {
    const context = await actor(), get = (key: string) => String(form.get(key) ?? "").trim();
    const connectionId = get("connectionId");
    if (form.get("confirm") !== "on") return { message: "أكّد تقديم القالب إلى Meta للمراجعة." };
    const payload = buildTemplateSubmission({ name: get("name"), language: get("language"), category: "MARKETING", body: get("body"), examples: get("examples"), header: "NONE", footer: "", buttonText: "", buttonUrl: "" });
    payload.components.push(productCarouselTemplateComponent());
    const connection = await db.whatsAppConnection.findFirst({ where: { id: connectionId, businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true }, select: { wabaId: true, credentialEnvelope: true } });
    if (!connection) return { message: "اختر رقمًا رسميًا متصلًا ومفعّلًا للتسويق." };
    if (!(await consumePublicWriteLimit({ scope: "whatsapp-template-submit", businessId: context.businessId, identity: context.userId, limit: 10, windowSeconds: 3600 })).allowed) return { message: "وصلت إلى حد تقديم القوالب المؤقت. حاول لاحقًا." };
    const catalog = await readMetaCatalog({ businessId: context.businessId, connectionId });
    if (!catalog.catalogs.length) return { message: "اربط كتالوج منتجات بحساب واتساب في Meta أولًا." };
    const config = getMetaWhatsAppConfig(), token = decryptWhatsAppCredential({ envelope: connection.credentialEnvelope as unknown as WhatsAppCredentialEnvelope, encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: context.businessId });
    await submitTemplateRequest({ url: metaWhatsAppGraphUrl(config, `${connection.wabaId}/message_templates`), token, payload, persist: receipt => persistSubmittedTemplate({ database: db, businessId: context.businessId, connectionId, payload, receipt }) });
    accepted = true;
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "template.carousel_create", targetType: "connection", targetId: connectionId, outcome: "success" });
    revalidatePath("/dashboard/whatsapp/templates");
    return { message: "استلمت Meta قالب الكاروسيل. تابع اعتماده في القوالب، ثم اختر منتجاته عند إنشاء الحملة.", stop: true };
  } catch (error) {
    if (accepted) return { message: "استلمت Meta القالب. تابع حالته في القوالب ولا تعِد تقديمه.", stop: true };
    if (error instanceof TemplateSubmissionError) return { message: submissionErrorMessage(error), stop: error.outcome !== "rejected" };
    return { message: templateValidationError(error)?.message ?? "تعذر تقديم القالب. تحقق من اتصال Meta والكتالوج والصلاحيات." };
  }
}
