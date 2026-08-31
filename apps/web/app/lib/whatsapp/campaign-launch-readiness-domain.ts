export const WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS = 20 * 60 * 1000;

export type WhatsAppCampaignLaunchReadiness =
  | { ready: true; code: "ready"; lastSucceededAt: Date; releaseSha: string }
  | {
      ready: false;
      code:
        | "worker_not_started"
        | "worker_failed"
        | "worker_stale"
        | "database_clock_unavailable"
        | "web_release_unavailable"
        | "worker_release_mismatch";
    };

export function evaluateWhatsAppCampaignLaunchReadiness(input: {
  currentTime: Date | null | undefined;
  expectedReleaseSha: string | null | undefined;
  heartbeat: {
    lastSucceededAt: Date | null;
    lastErrorCode: string | null;
    releaseSha: string | null;
  } | null | undefined;
  maxAgeMs?: number;
}): WhatsAppCampaignLaunchReadiness {
  const maxAgeMs = input.maxAgeMs ?? WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS;
  if (!input.currentTime) return { ready: false, code: "database_clock_unavailable" };
  if (!input.expectedReleaseSha || !/^[0-9a-f]{40}$/.test(input.expectedReleaseSha)) {
    return { ready: false, code: "web_release_unavailable" };
  }
  if (!input.heartbeat?.lastSucceededAt) return { ready: false, code: "worker_not_started" };
  if (input.heartbeat.lastErrorCode) return { ready: false, code: "worker_failed" };
  if (input.heartbeat.releaseSha !== input.expectedReleaseSha) {
    return { ready: false, code: "worker_release_mismatch" };
  }
  const ageMs = input.currentTime.getTime() - input.heartbeat.lastSucceededAt.getTime();
  if (ageMs < -60_000 || ageMs >= maxAgeMs) return { ready: false, code: "worker_stale" };
  return {
    ready: true,
    code: "ready",
    lastSucceededAt: input.heartbeat.lastSucceededAt,
    releaseSha: input.heartbeat.releaseSha,
  };
}
