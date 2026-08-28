"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";
import { createWhatsAppAutomation, operateWhatsAppAutomation } from "../lib/whatsapp/automation-operations";
import { createWhatsAppAutomationApiKey, revokeWhatsAppAutomationApiKey } from "../lib/whatsapp/automation-api-keys";
import { disconnectWhatsAppCommerceIntegration, registerWhatsAppCommerceIntegration } from "../lib/whatsapp/commerce-integrations";
import { cancelWhatsAppCampaign, pauseWhatsAppCampaign, resumeWhatsAppCampaign, scheduleWhatsAppCampaign } from "../lib/whatsapp/campaign-operations";
import { snapshotWhatsAppCampaign } from "../lib/whatsapp/campaign-snapshot";
import { enqueueContactImport, retryFailedContactImport } from "../lib/whatsapp/contact-import-processor";
import { MAX_CONTACT_IMPORT_BYTES, parseContactImport, type ContactImportFormat } from "../lib/whatsapp/contact-import";
import { enqueueWhatsAppCampaign } from "../lib/whatsapp/delivery-queue";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
import { createShopifyAuthorization } from "../lib/whatsapp/shopify-commerce";
import { retryShopifyWebhookSubscriptionSync } from "../lib/whatsapp/shopify-webhook-subscriptions";
import { syncMetaWhatsAppTemplates } from "../lib/whatsapp/template-sync";

const field = (form: FormData, key: string, max: number) => {
  const value = String(form.get(key) ?? "").trim();
  return value && value.length <= max ? value : null;
};

async function campaignContext() {
  const context = await getWhatsAppWriteContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  return context;
}

async function automationContext() {
  const context = await getWhatsAppWriteContext("automation.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  return context;
}

async function integrationContext() {
  const context = await getWhatsAppWriteContext("connection.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  return context;
}

export async function registerWhatsAppCommerceIntegrationAction(form: FormData) {
  const context = await integrationContext();
  const provider = field(form, "provider", 20), externalStoreId = field(form, "externalStoreId", 255);
  const displayName = field(form, "displayName", 120) ?? undefined;
  if (!provider || !externalStoreId) redirect("/dashboard/whatsapp/integrations?register=invalid");
  let destination: string;
  try {
    const result = await registerWhatsAppCommerceIntegration({ businessId: context.businessId, actorUserId: context.userId, provider, externalStoreId, displayName });
    revalidatePath("/dashboard/whatsapp/integrations");
    destination = `/dashboard/whatsapp/integrations?register=${result.existing ? "existing" : "draft"}`;
  } catch {
    destination = "/dashboard/whatsapp/integrations?register=failed";
  }
  redirect(destination);
}

export async function disconnectWhatsAppCommerceIntegrationAction(form: FormData) {
  const context = await integrationContext();
  const integrationId = field(form, "integrationId", 128);
  if (!integrationId) redirect("/dashboard/whatsapp/integrations?disconnect=invalid");
  let destination: string;
  try {
    await disconnectWhatsAppCommerceIntegration({ businessId: context.businessId, actorUserId: context.userId, integrationId });
    revalidatePath("/dashboard/whatsapp/integrations");
    destination = "/dashboard/whatsapp/integrations?disconnect=complete";
  } catch {
    destination = "/dashboard/whatsapp/integrations?disconnect=failed";
  }
  redirect(destination);
}

export async function startShopifyCommerceOAuthAction(form: FormData) {
  const context = await integrationContext();
  const integrationId = field(form, "integrationId", 128);
  if (!integrationId) redirect("/dashboard/whatsapp/integrations?shopify=invalid");
  let authorizationUrl: string;
  try {
    authorizationUrl = await createShopifyAuthorization({ businessId: context.businessId, userId: context.userId, integrationId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const result = code.startsWith("SHOPIFY_CONFIG_INVALID") ? "not-configured" : "start-failed";
    redirect(`/dashboard/whatsapp/integrations?shopify=${result}`);
  }
  redirect(authorizationUrl!);
}

export async function retryShopifyWebhookSubscriptionsAction(form: FormData) {
  const context = await integrationContext();
  const integrationId = field(form, "integrationId", 128);
  if (!integrationId) redirect("/dashboard/whatsapp/integrations?shopifySync=invalid");
  let result = "queued";
  try {
    await retryShopifyWebhookSubscriptionSync({ businessId: context.businessId, actorUserId: context.userId, integrationId });
    revalidatePath("/dashboard/whatsapp/integrations");
  } catch {
    result = "failed";
  }
  redirect(`/dashboard/whatsapp/integrations?shopifySync=${result}`);
}

export async function createWhatsAppAutomationAction(form: FormData) {
  const context = await automationContext();
  const name = field(form, "name", 120), triggerType = field(form, "triggerType", 40), templateId = field(form, "templateId", 128);
  const orderStatus = field(form, "orderStatus", 20) ?? undefined;
  const reminderLeadRaw = String(form.get("reminderLeadMinutes") ?? "").trim();
  const reminderLeadMinutes = /^\d{1,5}$/.test(reminderLeadRaw) ? Number(reminderLeadRaw) : undefined;
  const inactiveDaysRaw = String(form.get("inactiveDays") ?? "").trim();
  const inactiveDays = /^\d{1,3}$/.test(inactiveDaysRaw) ? Number(inactiveDaysRaw) : undefined;
  const apiEventName = field(form, "apiEventName", 64) ?? undefined;
  const cartDelayRaw = String(form.get("cartDelayMinutes") ?? "").trim();
  const cartDelayMinutes = /^\d{1,5}$/.test(cartDelayRaw) ? Number(cartDelayRaw) : undefined;
  const cooldownRaw = String(form.get("cooldownMinutes") ?? "").trim();
  if (!name || !triggerType || !templateId || !/^\d{1,6}$/.test(cooldownRaw)) redirect("/dashboard/whatsapp/automations?create=invalid");
  let destination: string;
  try {
    const automation = await createWhatsAppAutomation({
      businessId: context.businessId,
      actorUserId: context.userId,
      name,
      triggerType,
      templateId,
      cooldownMinutes: Number(cooldownRaw),
      orderStatus,
      reminderLeadMinutes,
      inactiveDays,
      apiEventName,
      cartDelayMinutes,
    });
    revalidatePath("/dashboard/whatsapp/automations");
    destination = `/dashboard/whatsapp/automations?create=complete&automation=${automation.id}`;
  } catch {
    destination = "/dashboard/whatsapp/automations?create=failed";
  }
  redirect(destination);
}

export async function operateWhatsAppAutomationAction(form: FormData) {
  const context = await automationContext();
  const automationId = field(form, "automationId", 128), operation = field(form, "operation", 20);
  if (!automationId || !operation || !["activate", "pause", "resume"].includes(operation)) redirect("/dashboard/whatsapp/automations?operation=invalid");
  let destination: string;
  try {
    await operateWhatsAppAutomation({
      businessId: context.businessId,
      actorUserId: context.userId,
      automationId,
      operation: operation as "activate" | "pause" | "resume",
    });
    revalidatePath("/dashboard/whatsapp/automations");
    destination = `/dashboard/whatsapp/automations?operation=${operation}`;
  } catch {
    destination = "/dashboard/whatsapp/automations?operation=failed";
  }
  redirect(destination);
}

export type AutomationApiKeyActionState = { status: "idle" | "created" | "failed"; plaintext?: string; error?: string };

export async function createWhatsAppAutomationApiKeyAction(_previous: AutomationApiKeyActionState, form: FormData): Promise<AutomationApiKeyActionState> {
  const context = await automationContext();
  const name = field(form, "name", 80);
  if (!name) return { status: "failed", error: "أدخل اسمًا صالحًا للمفتاح." };
  try {
    const created = await createWhatsAppAutomationApiKey({ businessId: context.businessId, actorUserId: context.userId, name });
    revalidatePath("/dashboard/whatsapp/automations");
    return { status: "created", plaintext: created.plaintext };
  } catch {
    return { status: "failed", error: "تعذر إنشاء المفتاح. حاول مرة أخرى." };
  }
}

export async function revokeWhatsAppAutomationApiKeyAction(form: FormData) {
  const context = await automationContext();
  const keyId = field(form, "keyId", 128);
  if (!keyId) redirect("/dashboard/whatsapp/automations?apiKey=invalid");
  let destination: string;
  try {
    await revokeWhatsAppAutomationApiKey({ businessId: context.businessId, actorUserId: context.userId, keyId });
    revalidatePath("/dashboard/whatsapp/automations");
    destination = "/dashboard/whatsapp/automations?apiKey=revoked";
  } catch {
    destination = "/dashboard/whatsapp/automations?apiKey=failed";
  }
  redirect(destination);
}

export async function importWhatsAppContactsAction(form: FormData) {
  const context = await campaignContext();
  const upload = form.get("file");
  const consentConfirmed = form.get("explicitConsent") === "on";
  const evidence = field(form, "consentEvidence", 500);
  if (!(upload instanceof File) || upload.size === 0 || upload.size > MAX_CONTACT_IMPORT_BYTES) redirect("/dashboard/whatsapp/contacts?import=invalid-file");
  const extension = upload.name.toLowerCase().split(".").pop();
  const format: ContactImportFormat | null = extension === "csv" ? "csv" : extension === "xlsx" ? "xlsx" : null;
  if (!format || (consentConfirmed && !evidence)) redirect("/dashboard/whatsapp/contacts?import=invalid-input");
  let destination: string;
  try {
    const parsed = await parseContactImport({ data: Buffer.from(await upload.arrayBuffer()), format, defaultCountryCallingCode: "966" });
    const result = await enqueueContactImport({ businessId: context.businessId, fileName: upload.name, format, parsed, consentEvidence: consentConfirmed ? evidence : null });
    const rejectedRows = Math.max(0, parsed.totalRows - parsed.rows.length - parsed.duplicateRows);
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "contacts.import.queue", targetType: "contact_import", targetId: result.importId, outcome: "success", metadata: { totalRows: parsed.totalRows, acceptedRows: parsed.rows.length, duplicateRows: parsed.duplicateRows, rejectedRows, alreadyQueued: result.alreadyQueued } });
    revalidatePath("/dashboard/whatsapp"); revalidatePath("/dashboard/whatsapp/contacts");
    destination = `/dashboard/whatsapp/contacts?import=${result.alreadyQueued ? "existing" : "queued"}&id=${result.importId}`;
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "contacts.import", targetType: "contact_import", outcome: "failed", metadata: { reason: code } }).catch(() => undefined);
    destination = "/dashboard/whatsapp/contacts?import=failed";
  }
  redirect(destination);
}

export async function retryWhatsAppContactImportAction(form: FormData) {
  const context = await campaignContext();
  const importId = field(form, "importId", 128);
  if (!importId) redirect("/dashboard/whatsapp/contacts?retry=invalid");
  let destination: string;
  try {
    const result = await retryFailedContactImport({ businessId: context.businessId, importId });
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "contacts.import.retry", targetType: "contact_import", targetId: importId, outcome: "success", metadata: { queuedBatches: result.queuedBatches } });
    revalidatePath("/dashboard/whatsapp/contacts");
    destination = "/dashboard/whatsapp/contacts?retry=queued";
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN";
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "contacts.import.retry", targetType: "contact_import", targetId: importId, outcome: "failed", metadata: { reason } }).catch(() => undefined);
    destination = "/dashboard/whatsapp/contacts?retry=failed";
  }
  redirect(destination);
}

export async function syncWhatsAppTemplatesAction(form: FormData) {
  const context = await campaignContext();
  const connectionId = field(form, "connectionId", 128);
  if (!connectionId) redirect("/dashboard/whatsapp/templates?sync=invalid");
  let destination: string;
  try {
    const result = await syncMetaWhatsAppTemplates({ businessId: context.businessId, connectionId });
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "templates.sync", targetType: "connection", targetId: connectionId, outcome: "success", metadata: { synced: result.synced, approved: result.approved, pending: result.pending, rejected: result.rejected } });
    revalidatePath("/dashboard/whatsapp/templates");
    destination = `/dashboard/whatsapp/templates?sync=complete&count=${result.synced}`;
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "templates.sync", targetType: "connection", targetId: connectionId, outcome: "failed", metadata: { reason: code } }).catch(() => undefined);
    destination = "/dashboard/whatsapp/templates?sync=failed";
  }
  redirect(destination);
}

export async function createWhatsAppCampaignAction(form: FormData) {
  const context = await campaignContext();
  const name = field(form, "name", 120), connectionId = field(form, "connectionId", 128), templateId = field(form, "templateId", 128);
  if (!name || !connectionId || !templateId) redirect("/dashboard/whatsapp/campaigns?create=invalid");
  let destination: string;
  try {
    const contactIds = await db.whatsAppContact.findMany({ where: { businessId: context.businessId, optedOutAt: null }, select: { id: true, phoneE164: true }, take: 10_001 });
    if (contactIds.length > 10_000) throw new Error("WHATSAPP_CAMPAIGN_AUDIENCE_TOO_LARGE");
    const consents = await db.whatsAppConsent.findMany({ where: { businessId: context.businessId, phoneE164: { in: contactIds.map((item) => item.phoneE164) }, revokedAt: null }, select: { phoneE164: true } });
    const allowed = new Set(consents.map((item) => item.phoneE164));
    const audience = contactIds.filter((item) => allowed.has(item.phoneE164)).map((item) => item.id);
    if (!audience.length) throw new Error("WHATSAPP_CAMPAIGN_NO_ELIGIBLE_RECIPIENTS");
    const campaign = await db.$transaction(async (tx) => {
      const template = await tx.whatsAppTemplate.findFirst({ where: { id: templateId, businessId: context.businessId, connectionId, status: "approved" }, select: { id: true } });
      const connection = await tx.whatsAppConnection.findFirst({ where: { id: connectionId, businessId: context.businessId, status: "connected" }, select: { id: true } });
      if (!template || !connection) throw new Error("WHATSAPP_CAMPAIGN_CONFIGURATION_INVALID");
      const created = await tx.whatsAppCampaign.create({ data: { id: randomUUID(), businessId: context.businessId, connectionId, templateId, name, audienceDefinition: { kind: "contacts", contactIds: audience } as Prisma.InputJsonValue } });
      await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "campaign.create", targetType: "campaign", targetId: created.id, outcome: "success", metadata: { audienceSize: audience.length }, database: tx });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await snapshotWhatsAppCampaign({ businessId: context.businessId, campaignId: campaign.id });
    revalidatePath("/dashboard/whatsapp/campaigns");
    destination = `/dashboard/whatsapp/campaigns?create=complete&campaign=${campaign.id}`;
  } catch {
    destination = "/dashboard/whatsapp/campaigns?create=failed";
  }
  redirect(destination);
}

export async function operateWhatsAppCampaignAction(form: FormData) {
  const context = await campaignContext();
  const campaignId = field(form, "campaignId", 128), operation = field(form, "operation", 20);
  if (!campaignId || !operation) redirect("/dashboard/whatsapp/campaigns?operation=invalid");
  let destination: string;
  try {
    if (operation === "launch") await enqueueWhatsAppCampaign({ businessId: context.businessId, campaignId });
    else if (operation === "schedule") {
      const scheduledAt = new Date(String(form.get("scheduledAt") ?? ""));
      await scheduleWhatsAppCampaign({ businessId: context.businessId, campaignId, scheduledAt });
    } else if (operation === "pause") await pauseWhatsAppCampaign({ businessId: context.businessId, campaignId });
    else if (operation === "resume") await resumeWhatsAppCampaign({ businessId: context.businessId, campaignId });
    else if (operation === "cancel") await cancelWhatsAppCampaign({ businessId: context.businessId, campaignId });
    else throw new Error("WHATSAPP_CAMPAIGN_OPERATION_INVALID");
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: `campaign.${operation}`, targetType: "campaign", targetId: campaignId, outcome: "success" });
    revalidatePath("/dashboard/whatsapp/campaigns");
    destination = `/dashboard/whatsapp/campaigns?operation=${operation}`;
  } catch {
    destination = "/dashboard/whatsapp/campaigns?operation=failed";
  }
  redirect(destination);
}
