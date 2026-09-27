export type CampaignSendPolicy = { perMinute: number; startHour: number; endHour: number; timeZone: "Asia/Riyadh" | "UTC" };
export function parseCampaignSendPolicy(raw: unknown): CampaignSendPolicy | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { throw new Error("WHATSAPP_CAMPAIGN_SEND_POLICY_INVALID"); } }
  const p = raw as Partial<CampaignSendPolicy>;
  if (!p || !Number.isInteger(p.perMinute) || p.perMinute! < 1 || p.perMinute! > 1000 || !Number.isInteger(p.startHour) || p.startHour! < 0 || p.startHour! > 23 || !Number.isInteger(p.endHour) || p.endHour! < 0 || p.endHour! > 23 || !["Asia/Riyadh", "UTC"].includes(String(p.timeZone))) throw new Error("WHATSAPP_CAMPAIGN_SEND_POLICY_INVALID");
  return p as CampaignSendPolicy;
}
export function nextCampaignWindow(policy: CampaignSendPolicy | null, now: Date): Date {
  if (!policy || policy.startHour === policy.endHour) return now;
  const offset = policy.timeZone === "Asia/Riyadh" ? 3 : 0;
  const localHour = (now.getUTCHours() + offset) % 24;
  const allowed = policy.startHour < policy.endHour ? localHour >= policy.startHour && localHour < policy.endHour : localHour >= policy.startHour || localHour < policy.endHour;
  if (allowed) return now;
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + (policy.startHour - localHour + 24) % 24);
  return next;
}
