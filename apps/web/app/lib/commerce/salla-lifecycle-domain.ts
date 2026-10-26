const record = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;

export function sallaLifecycleDate(value: unknown, legacyOffsetMinutes: number) {
  if (typeof value !== "string" || !Number.isInteger(legacyOffsetMinutes) || legacyOffsetMinutes < -720 || legacyOffsetMinutes > 840) return null;
  const text = value.trim();
  const match = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d):(\d\d)(?:\.\d{1,6})?(Z|[+-]\d\d:\d\d)?$/.exec(text);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const dayCheck = new Date(Date.UTC(year, month - 1, day));
  if (year < 2000 || year > 2100 || dayCheck.getUTCFullYear() !== year || dayCheck.getUTCMonth() !== month - 1
    || dayCheck.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return null;
  const offset = match[7] || `${legacyOffsetMinutes < 0 ? "-" : "+"}${String(Math.floor(Math.abs(legacyOffsetMinutes) / 60)).padStart(2, "0")}:${String(Math.abs(legacyOffsetMinutes) % 60).padStart(2, "0")}`;
  const result = new Date(text.replace(" ", "T").replace(/(?:Z|[+-]\d\d:\d\d)$/, "") + offset);
  return Number.isFinite(result.getTime()) ? result : null;
}

export function parseSallaUninstall(payload: unknown, expectedAppId: string, now: Date, legacyOffsetMinutes: number) {
  const root = record(payload), data = record(root?.data);
  const appId = typeof data?.id === "string" || typeof data?.id === "number" ? String(data.id) : "";
  if (root?.event !== "app.uninstalled" || appId !== expectedAppId) throw new Error("SALLA_UNINSTALL_APP_MISMATCH");
  const uninstalledAt = sallaLifecycleDate(data?.uninstallation_date ?? root.created_at, legacyOffsetMinutes);
  if (!uninstalledAt || uninstalledAt.getTime() > now.getTime() + 300_000) throw new Error("SALLA_UNINSTALL_DATE_INVALID");
  return { appId, uninstalledAt };
}

export function sallaUninstallIsStale(uninstalledAt: Date, connectedAt: Date | null) {
  // Never round a newer connection down to provider second precision: an
  // ambiguous old event must not revoke credentials issued after its timestamp.
  return Boolean(connectedAt && uninstalledAt < connectedAt);
}
