import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "../db";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "./credential-envelope";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl, type MetaWhatsAppConfig } from "./meta-config";
import { parseMetaTemplate, type ParsedMetaTemplate } from "./template-domain";

type JsonRecord = Record<string, unknown>;
type TemplateDb = Pick<PrismaClient, "$transaction" | "whatsAppConnection">;
type Fetcher = typeof fetch;

const record = (value: unknown): JsonRecord | null => value && typeof value === "object" && !Array.isArray(value)
  ? value as JsonRecord
  : null;
const text = (value: unknown, limit = 4096) => typeof value === "string" && value.length > 0 && value.length <= limit
  ? value
  : null;

function credentialEnvelope(value: Prisma.JsonValue): WhatsAppCredentialEnvelope {
  const envelope = record(value);
  if (
    envelope?.v !== 1 || envelope.alg !== "aes-256-gcm" ||
    !text(envelope.keyVersion) || !text(envelope.iv) || !text(envelope.ciphertext) || !text(envelope.tag)
  ) throw new Error("META_WHATSAPP_CREDENTIAL_ENVELOPE_INVALID");
  return envelope as WhatsAppCredentialEnvelope;
}

async function fetchTemplatePage(input: { url: URL; accessToken: string; fetcher: Fetcher }) {
  const response = await input.fetcher(input.url, {
    method: "GET",
    headers: { authorization: `Bearer ${input.accessToken}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`META_WHATSAPP_TEMPLATE_SYNC_HTTP_${response.status}`);
  const payload: unknown = await response.json();
  const root = record(payload);
  if (!root || !Array.isArray(root.data)) throw new Error("META_WHATSAPP_TEMPLATE_SYNC_RESPONSE_INVALID");
  const paging = record(root.paging);
  const cursors = record(paging?.cursors);
  return {
    templates: root.data.map(parseMetaTemplate).filter((item): item is ParsedMetaTemplate => Boolean(item)),
    receivedCount: root.data.length,
    after: text(cursors?.after),
  };
}

export async function fetchAllMetaTemplates(input: {
  wabaId: string;
  accessToken: string;
  config: Pick<MetaWhatsAppConfig, "META_WHATSAPP_GRAPH_VERSION">;
  fetcher?: Fetcher;
}) {
  const fetcher = input.fetcher ?? fetch;
  const url = new URL(metaWhatsAppGraphUrl(input.config, `${input.wabaId}/message_templates`));
  url.searchParams.set("fields", "id,name,language,status,category,components,quality_score,rejected_reason,parameter_format");
  url.searchParams.set("limit", "100");
  const templates: ParsedMetaTemplate[] = [];
  for (let page = 0; page < 20; page += 1) {
    const result = await fetchTemplatePage({ url, accessToken: input.accessToken, fetcher });
    templates.push(...result.templates);
    if (result.templates.length !== result.receivedCount) throw new Error("META_WHATSAPP_TEMPLATE_SYNC_ITEM_INVALID");
    if (!result.after) return templates;
    url.searchParams.set("after", result.after);
  }
  throw new Error("META_WHATSAPP_TEMPLATE_SYNC_PAGE_LIMIT");
}

export async function syncMetaWhatsAppTemplates(input: {
  businessId: string;
  connectionId: string;
  database?: TemplateDb;
  config?: MetaWhatsAppConfig;
  fetcher?: Fetcher;
}) {
  const database = input.database ?? db;
  const config = input.config ?? getMetaWhatsAppConfig();
  const connection = await database.whatsAppConnection.findFirst({
    where: { id: input.connectionId, businessId: input.businessId, provider: "meta", status: "connected", disabledAt: null },
    select: { id: true, businessId: true, wabaId: true, credentialEnvelope: true },
  });
  if (!connection) throw new Error("META_WHATSAPP_TEMPLATE_CONNECTION_NOT_READY");

  const accessToken = decryptWhatsAppCredential({
    envelope: credentialEnvelope(connection.credentialEnvelope),
    encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY,
    businessId: input.businessId,
  });
  const templates = await fetchAllMetaTemplates({ wabaId: connection.wabaId, accessToken, config, fetcher: input.fetcher });
  const syncedAt = new Date();

  await database.$transaction(async (tx) => {
    for (const template of templates) {
      const collision = await tx.whatsAppTemplate.findUnique({
        where: { provider_providerTemplateId: { provider: "meta", providerTemplateId: template.providerTemplateId } },
        select: { businessId: true, connectionId: true },
      });
      if (collision && (collision.businessId !== input.businessId || collision.connectionId !== input.connectionId)) {
        throw new Error("META_WHATSAPP_TEMPLATE_TENANT_COLLISION");
      }
      await tx.whatsAppTemplate.upsert({
        where: { provider_providerTemplateId: { provider: "meta", providerTemplateId: template.providerTemplateId } },
        create: {
          id: randomUUID(), businessId: input.businessId, connectionId: input.connectionId,
          provider: "meta", ...template,
          components: template.components as Prisma.InputJsonValue,
          rawPayload: template.rawPayload as Prisma.InputJsonValue,
          lastSyncedAt: syncedAt,
        },
        update: {
          name: template.name, language: template.language, category: template.category,
          status: template.status, providerStatus: template.providerStatus,
          parameterFormat: template.parameterFormat, qualityScore: template.qualityScore,
          rejectedReason: template.rejectedReason,
          components: template.components as Prisma.InputJsonValue,
          rawPayload: template.rawPayload as Prisma.InputJsonValue,
          lastSyncedAt: syncedAt,
        },
      });
    }
    const staleWhere = templates.length > 0
      ? { providerTemplateId: { notIn: templates.map((template) => template.providerTemplateId) } }
      : {};
    await tx.whatsAppTemplate.updateMany({
      where: { businessId: input.businessId, connectionId: input.connectionId, provider: "meta", ...staleWhere },
      data: { status: "disabled", providerStatus: "NOT_RETURNED_BY_SYNC", lastSyncedAt: syncedAt },
    });
  });

  return {
    synced: templates.length,
    approved: templates.filter((template) => template.status === "approved").length,
    pending: templates.filter((template) => template.status === "pending").length,
    rejected: templates.filter((template) => template.status === "rejected").length,
    syncedAt,
  };
}
