export type WhatsAppTemplateStatus = "approved" | "pending" | "rejected" | "paused" | "disabled" | "unknown";
export type WhatsAppTemplateCategory = "marketing" | "utility" | "authentication" | "unknown";

type JsonRecord = Record<string, unknown>;

export type ParsedMetaTemplate = {
  providerTemplateId: string;
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  status: WhatsAppTemplateStatus;
  providerStatus: string;
  parameterFormat: string | null;
  qualityScore: string | null;
  rejectedReason: string | null;
  components: JsonRecord[];
  rawPayload: JsonRecord;
};

const record = (value: unknown): JsonRecord | null => value && typeof value === "object" && !Array.isArray(value)
  ? value as JsonRecord
  : null;
const text = (value: unknown, limit = 255) => typeof value === "string" && value.trim().length > 0 && value.length <= limit
  ? value.trim()
  : null;

export function normalizeMetaTemplateStatus(value: unknown): WhatsAppTemplateStatus {
  const status = text(value)?.toUpperCase();
  if (status === "APPROVED") return "approved";
  if (status === "PENDING") return "pending";
  if (status === "REJECTED") return "rejected";
  if (status === "PAUSED") return "paused";
  if (status === "DISABLED") return "disabled";
  return "unknown";
}

export function normalizeMetaTemplateCategory(value: unknown): WhatsAppTemplateCategory {
  const category = text(value)?.toUpperCase();
  if (category === "MARKETING") return "marketing";
  if (category === "UTILITY") return "utility";
  if (category === "AUTHENTICATION") return "authentication";
  return "unknown";
}

export function parseMetaTemplate(value: unknown): ParsedMetaTemplate | null {
  const template = record(value);
  if (!template) return null;
  const providerTemplateId = text(template.id, 128);
  const name = text(template.name, 512);
  const language = text(template.language, 64);
  const providerStatus = text(template.status, 128);
  const rawComponents = Array.isArray(template.components) ? template.components : [];
  const components = rawComponents.slice(0, 20).map(record).filter((item): item is JsonRecord => Boolean(item));
  if (!providerTemplateId || !name || !language || !providerStatus || rawComponents.length > 20) return null;

  const serialized = JSON.stringify(template);
  if (serialized.length > 256 * 1024) return null;
  const quality = record(template.quality_score);
  return {
    providerTemplateId,
    name,
    language,
    category: normalizeMetaTemplateCategory(template.category),
    status: normalizeMetaTemplateStatus(providerStatus),
    providerStatus,
    parameterFormat: text(template.parameter_format, 64),
    qualityScore: text(quality?.score, 64),
    rejectedReason: text(template.rejected_reason, 1024),
    components,
    rawPayload: JSON.parse(serialized) as JsonRecord,
  };
}

export function isTemplateSendEligible(template: Pick<ParsedMetaTemplate, "status" | "category">) {
  return template.status === "approved" && template.category !== "unknown";
}
