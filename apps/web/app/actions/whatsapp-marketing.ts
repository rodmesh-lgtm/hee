"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";
import { cancelWhatsAppCampaign, pauseWhatsAppCampaign, resumeWhatsAppCampaign, scheduleWhatsAppCampaign } from "../lib/whatsapp/campaign-operations";
import { snapshotWhatsAppCampaign } from "../lib/whatsapp/campaign-snapshot";
import { persistContactImport } from "../lib/whatsapp/contact-import-processor";
import { MAX_CONTACT_IMPORT_BYTES, parseContactImport, type ContactImportFormat } from "../lib/whatsapp/contact-import";
import { enqueueWhatsAppCampaign } from "../lib/whatsapp/delivery-queue";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
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
    const result = await persistContactImport({ businessId: context.businessId, fileName: upload.name, format, parsed });
    let consented = 0;
    if (consentConfirmed && evidence) {
      for (const row of parsed.rows) {
        const existing = await db.whatsAppConsent.findUnique({ where: { businessId_phoneE164: { businessId: context.businessId, phoneE164: row.phoneE164 } }, select: { id: true, revokedAt: true } });
        if (existing) continue;
        await db.whatsAppConsent.create({ data: { id: randomUUID(), businessId: context.businessId, phoneE164: row.phoneE164, source: "manual_import", evidence, consentedAt: new Date() } });
        consented += 1;
      }
    }
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "contacts.import", targetType: "contact_import", targetId: result.importId, outcome: "success", metadata: { totalRows: result.totalRows, importedRows: result.importedRows, duplicateRows: result.duplicateRows, rejectedRows: result.rejectedRows, consented } });
    revalidatePath("/dashboard/whatsapp"); revalidatePath("/dashboard/whatsapp/contacts");
    destination = `/dashboard/whatsapp/contacts?import=complete&imported=${result.importedRows}&duplicates=${result.duplicateRows}&rejected=${result.rejectedRows}&consented=${consented}`;
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "contacts.import", targetType: "contact_import", outcome: "failed", metadata: { reason: code } }).catch(() => undefined);
    destination = "/dashboard/whatsapp/contacts?import=failed";
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
