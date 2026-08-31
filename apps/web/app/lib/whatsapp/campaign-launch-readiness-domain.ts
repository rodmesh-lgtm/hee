export const WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS = 20 * 60 * 1000;

export type WhatsAppCampaignLaunchReadiness =
  | { ready: true; code: "ready"; lastSucceededAt: Date; releaseSha: string | null }
  | { ready: false; code: "worker_not_started" | "worker_failed" | "worker_stale" | "database_clock_unavailable" };

export function evaluateWhatsAppCampaignLaunchReadiness(input: {
  currentTime: Date | null | undefined;
  heartbeat: {
    lastSucceededAt: Date | null;
    lastErrorCode: string | null;
    releaseSha: string | null;
  } | null | undefined;
  maxAgeMs?: number;
}): WhatsAppCampaignLaunchReadiness {
  const maxAgeMs = input.maxAgeMs ?? WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS;
  if (!input.currentTime) return { ready: false, code: "database_clock_unavailable" };
  if (!input.heartbeat?.lastSucceededAt) return { ready: false, code: "worker_not_started" };
  if (input.heartbeat.lastErrorCode) return { ready: false, code: "worker_failed" };
  const ageMs = input.currentTime.getTime() - input.heartbeat.lastSucceededAt.getTime();
  if (ageMs < -60_000 || ageMs >= maxAgeMs) return { ready: false, code: "worker_stale" };
  return {
    ready: true,
    code: "ready",
    lastSucceededAt: input.heartbeat.lastSucceededAt,
    releaseSha: input.heartbeat.releaseSha,
  };
}
