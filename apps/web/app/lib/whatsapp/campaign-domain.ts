export type CampaignAudience =
  | { kind: "contacts"; contactIds: string[] }
  | { kind: "static_segment"; segmentId: string };

type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord | null => value && typeof value === "object" && !Array.isArray(value)
  ? value as JsonRecord
  : null;

export function parseCampaignAudience(value: unknown): CampaignAudience | null {
  const audience = record(value);
  if (audience?.kind === "contacts" && Array.isArray(audience.contactIds)) {
    const ids = audience.contactIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 128);
    const unique = [...new Set(ids)];
    return unique.length > 0 && unique.length <= 10_000 && unique.length === audience.contactIds.length
      ? { kind: "contacts", contactIds: unique }
      : null;
  }
  if (audience?.kind === "static_segment" && typeof audience.segmentId === "string" && audience.segmentId.length > 0 && audience.segmentId.length <= 128) {
    return { kind: "static_segment", segmentId: audience.segmentId };
  }
  return null;
}

export function boundedTemplateParameters(value: unknown): JsonRecord | unknown[] | null {
  if (value == null) return null;
  if ((typeof value !== "object") || value instanceof Date) return null;
  const serialized = JSON.stringify(value);
  if (serialized.length > 16 * 1024) return null;
  return JSON.parse(serialized) as JsonRecord | unknown[];
}
