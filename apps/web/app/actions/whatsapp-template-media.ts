"use server";
import { db } from "../lib/db";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "../lib/whatsapp/credential-envelope";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl } from "../lib/whatsapp/meta-config";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { validateTemplateMedia, TEMPLATE_MEDIA_CHUNK_BYTES } from "../lib/whatsapp/template-media-domain";
import { openMediaTicket, sealMediaTicket, sessionPath, uploadTemplateChunk } from "../lib/whatsapp/template-media-upload";

async function uploadContext(connectionId: string) {
  const context = await getWhatsAppWriteContext("campaign.manage");
  if (!context || !await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) throw new Error("TEMPLATE_MEDIA_ACCESS_DENIED");
  const connection = await db.whatsAppConnection.findFirst({ where: { id: connectionId, businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true }, select: { credentialEnvelope: true } });
  if (!connection) throw new Error("TEMPLATE_MEDIA_ACCESS_DENIED");
  const config = getMetaWhatsAppConfig();
  const token = decryptWhatsAppCredential({ envelope: connection.credentialEnvelope as unknown as WhatsAppCredentialEnvelope, encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: context.businessId });
  return { scope: { businessId: context.businessId, userId: context.userId, connectionId }, config, token };
}
export async function startTemplateMediaUploadAction(input: { connectionId: string; header: string; mime: string; size: number }) {
  try {
    validateTemplateMedia(input.header, input.mime, input.size);
    const { scope, config, token } = await uploadContext(input.connectionId);
    const rate = await consumePublicWriteLimit({ scope: "template-media-start", businessId: scope.businessId, identity: scope.userId, limit: 20, windowSeconds: 3600 });
    if (!rate.allowed) return { error: "وصلت إلى حد محاولات رفع العينات خلال الساعة. حاول لاحقًا." };
    const url = new URL(metaWhatsAppGraphUrl(config, `${config.META_APP_ID}/uploads`));
    url.searchParams.set("file_length", String(input.size)); url.searchParams.set("file_type", input.mime);
    const response = await fetch(url, { method: "POST", redirect: "error", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("TEMPLATE_MEDIA_START_FAILED");
    const result = await response.json() as { id: string }; sessionPath(result.id);
    return { ticket: sealMediaTicket({ purpose: "template-media", expires: Date.now() + 3600000, header: input.header, mime: input.mime, size: input.size, offset: 0, session: result.id }, scope, config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY) };
  } catch { return { error: "تعذر بدء رفع العينة. تحقق من اتصال حساب Meta ونوع الملف وحجمه ثم حاول مجددًا." }; }
}
export async function uploadTemplateMediaChunkAction(form: FormData) {
  try {
    const { scope, config, token } = await uploadContext(String(form.get("connectionId") ?? ""));
    const ticket = openMediaTicket(String(form.get("ticket") ?? ""), scope, config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY);
    const file = form.get("chunk");
    if (!(file instanceof File) || file.size > TEMPLATE_MEDIA_CHUNK_BYTES) throw new Error("TEMPLATE_MEDIA_CHUNK_INVALID");
    const rate = await consumePublicWriteLimit({ scope: "template-media-chunk", businessId: scope.businessId, identity: scope.userId, limit: 1200, windowSeconds: 3600 });
    if (!rate.allowed) throw new Error("TEMPLATE_MEDIA_RATE_LIMIT");
    const [path, query] = sessionPath(ticket.session).split("?"); const url = new URL(metaWhatsAppGraphUrl(config, path));
    if (query) url.searchParams.set("sig", new URLSearchParams(query).get("sig")!);
    const uploaded = await uploadTemplateChunk({ ticket, bytes: new Uint8Array(await file.arrayBuffer()), url: url.toString(), token });
    return { ticket: sealMediaTicket(uploaded, scope, config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY), completed: Boolean(uploaded.handle), uploaded: uploaded.offset };
  } catch { return { error: "توقف رفع العينة ولم يُرسل القالب للمراجعة. احتفظ بالصفحة مفتوحة وأعد المحاولة لبدء رفع جديد." }; }
}
