import "server-only";
import { reserveTemplateProcessing } from "../commercial-usage";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { connectorOnline } from "./camera-profiles";
import { liveViewTemplateSupported, liveViewTemplateParameters, liveViewWatchCapability, LIVE_VIEW_TEMPLATE_NAME, liveViewRecipientPhone } from "./whatsapp-domain";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "../whatsapp/credential-envelope";
import { assertOutboundEnabled, outboundRateLimit } from "../whatsapp/delivery-domain";
import { commercialAccess } from "../commercial-access";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl, type MetaWhatsAppConfig } from "../whatsapp/meta-config";

const ACTION = "live-view.whatsapp.send";
type Input = { businessId: string; actorUserId: string; sessionId: string; watchPath: string; phone: string; consent: boolean };
type Dependencies = { database?: PrismaClient; fetcher?: typeof fetch; env?: NodeJS.ProcessEnv; config?: MetaWhatsAppConfig; entitled?: (businessId: string) => Promise<boolean> };

export async function sendLiveViewWhatsApp(input: Input, deps: Dependencies = {}) {
  const database = deps.database ?? db, env = deps.env ?? process.env;
  assertOutboundEnabled(env);
  const phone = liveViewRecipientPhone(input.phone);
  if (!phone || !input.consent) throw new Error("LIVE_PHONE_CONSENT_REQUIRED");
  const capability = liveViewWatchCapability(input.watchPath);
  const entitled = deps.entitled ?? (async businessId => (await commercialAccess(businessId,database)).liveView);
  if (!await entitled(input.businessId)) throw new Error("LIVE_WHATSAPP_ENTITLEMENT_REQUIRED");
  const template = await database.whatsAppTemplate.findFirst({ where: { businessId: input.businessId, provider: "meta", name: LIVE_VIEW_TEMPLATE_NAME, status: "approved", category: "utility", connection: { businessId: input.businessId, provider: "meta", status: "connected", disabledAt: null, OR:[{marketingEnabled:true},{bookingEnabled:true}] } }, include: { connection: true }, orderBy: { lastSyncedAt: "desc" } });
  if (!template || !liveViewTemplateSupported(template)) throw new Error("LIVE_WHATSAPP_TEMPLATE_REQUIRED");
  const config = deps.config ?? getMetaWhatsAppConfig(env);
  const accessToken = decryptWhatsAppCredential({ envelope: template.connection.credentialEnvelope as WhatsAppCredentialEnvelope, encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: input.businessId });
  // One durable claim per session + current capability, independent of recipient.
  // The raw bearer link and full recipient are never written to this audit record.
  const targetId = `${input.sessionId}:${capability.hash}`;
  const claim = await database.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-whatsapp:${input.businessId}:${input.sessionId}`}))`;
    const previous = await tx.whatsAppAuditLog.findFirst({ where: { businessId: input.businessId, action: ACTION, targetId, outcome: { in: ["processing", "accepted", "unknown"] } }, orderBy: { createdAt: "desc" } });
    if (previous) return { duplicate: previous.outcome };
    const session = await tx.liveViewSession.findFirst({ where: { id: input.sessionId, businessId: input.businessId, tokenHash: capability.hash, endedAt: null, expiresAt: { gt: new Date() }, business: { deletedAt: null }, station: { enabled: true } }, include: { station: { include: { connector: true } }, business: { select: { name: true } } } });
    if (!session || (session.station.connectorId && (!session.station.connector || !connectorOnline(session.station.connector)))) throw new Error("LIVE_SESSION_UNAVAILABLE");
    const contact = await tx.whatsAppContact.findUnique({ where: { businessId_phoneE164: { businessId: input.businessId, phoneE164: phone } }, select: { optedOutAt: true, deletedAt: true } });
    if (contact?.optedOutAt || contact?.deletedAt) throw new Error("LIVE_RECIPIENT_OPTED_OUT");
    const now = new Date(), windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
    const slots = await tx.$queryRaw<Array<{ sentCount: number }>>(Prisma.sql`INSERT INTO "WhatsAppSendRateBucket" ("connectionId","businessId","windowStart","sentCount","updatedAt") VALUES (${template.connectionId},${input.businessId},${windowStart},1,${now}) ON CONFLICT ("connectionId","windowStart") DO UPDATE SET "sentCount"="WhatsAppSendRateBucket"."sentCount"+1,"updatedAt"=${now} WHERE "WhatsAppSendRateBucket"."businessId"=${input.businessId} AND "WhatsAppSendRateBucket"."sentCount" < ${outboundRateLimit(env)} RETURNING "sentCount"`);
    if (!slots.length) throw new Error("LIVE_WHATSAPP_RATE_LIMITED");
    const receipt = await tx.whatsAppAuditLog.create({ data: { businessId: input.businessId, actorUserId: input.actorUserId, action: ACTION, targetType: "live-view-session", targetId, outcome: "processing", metadata: { sessionId: session.id, phoneSuffix: phone.slice(-4), templateId: template.id, consentConfirmed: true } } });
    return { receiptId: receipt.id, session };
  });
  if (claim.duplicate) return { status: claim.duplicate === "accepted" ? "already_accepted" : "unknown" } as const;
  if (!claim.session || !claim.receiptId) throw new Error("LIVE_SEND_CLAIM_INVALID");
  const receiptId = claim.receiptId;
  let response: Response;
  try {
    // Revalidate immediately before the external side effect, including rotation.
    const current = await database.liveViewSession.findFirst({ where: { id: input.sessionId, businessId: input.businessId, tokenHash: capability.hash, endedAt: null, expiresAt: { gt: new Date() }, station: { enabled: true }, business: { deletedAt: null } }, select: { id: true } });
    if (!current) { await database.whatsAppAuditLog.update({ where: { id: receiptId }, data: { outcome: "cancelled" } }); throw new Error("LIVE_SESSION_UNAVAILABLE"); }
    await reserveTemplateProcessing(input.businessId,receiptId,database,"operational");
    response = await (deps.fetcher ?? fetch)(metaWhatsAppGraphUrl(config, `${template.connection.phoneNumberId}/messages`), { method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "template", template: { name: template.name, language: { code: template.language }, components: liveViewTemplateParameters(claim.session.customerName, claim.session.business.name, claim.session.reference, input.watchPath) } }) });
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_SESSION_UNAVAILABLE") throw error;
    await database.whatsAppAuditLog.update({ where: { id: receiptId }, data: { outcome: "unknown" } });
    return { status: "unknown" } as const;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    // Error bodies can echo template parameters: never persist or return them.
    await database.whatsAppAuditLog.update({ where: { id: receiptId }, data: { outcome: response.status >= 500 ? "unknown" : "rejected" } });
    return { status: response.status >= 500 ? "unknown" : "rejected" } as const;
  }
  const providerMessageId = payload?.messages?.[0]?.id;
  if (typeof providerMessageId !== "string" || !providerMessageId || providerMessageId.length > 256) {
    await database.whatsAppAuditLog.update({ where: { id: receiptId }, data: { outcome: "unknown" } });
    return { status: "unknown" } as const;
  }
  await database.$transaction(async tx => {
    const conversation = await tx.whatsAppConversation.upsert({ where: { businessId_phoneNumberId_customerPhoneE164: { businessId: input.businessId, phoneNumberId: template.connection.phoneNumberId, customerPhoneE164: phone } }, create: { businessId: input.businessId, phoneNumberId: template.connection.phoneNumberId, customerPhoneE164: phone, customerDisplayName: claim.session.customerName, lastMessageAt: new Date(), lastOutboundAt: new Date() }, update: { lastMessageAt: new Date(), lastOutboundAt: new Date() } });
    await tx.whatsAppMessage.create({ data: { businessId: input.businessId, conversationId: conversation.id, provider: "meta", providerMessageId, direction: "outbound", messageType: "template", status: "sent", textBody: `رابط مشاهدة مؤقت — مرجع ${claim.session.reference} (الرابط مخفي لحماية خصوصية العميل)`, sentAt: new Date() } });
    await tx.whatsAppAuditLog.update({ where: { id: receiptId }, data: { outcome: "accepted", metadata: { sessionId: input.sessionId, phoneSuffix: phone.slice(-4), providerMessageId, templateId: template.id, consentConfirmed: true } } });
  });
  return { status: "accepted" } as const;
}
