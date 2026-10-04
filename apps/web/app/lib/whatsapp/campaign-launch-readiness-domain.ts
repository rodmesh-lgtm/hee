export const WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS = 20 * 60 * 1000;

export type WhatsAppCampaignLaunchReadiness =
  | { ready: true; code: "ready"; lastSucceededAt: Date; releaseSha: string }
  | {
      ready: false;
      code:
        | "worker_not_started"
        | "worker_failed"
        | "worker_stale"
        | "worker_outbound_unverified"
        | "outbound_disabled"
        | "database_clock_unavailable"
        | "web_release_unavailable"
        | "worker_release_mismatch";
    };

export function evaluateWhatsAppCampaignLaunchReadiness(input: {
  outboundEnabled?: boolean;
  currentTime: Date | null | undefined;
  expectedReleaseSha: string | null | undefined;
  heartbeat: {
    lastSucceededAt: Date | null;
    lastErrorCode: string | null;
    releaseSha: string | null;
    details?: unknown;
  } | null | undefined;
  maxAgeMs?: number;
}): WhatsAppCampaignLaunchReadiness {
  const maxAgeMs = input.maxAgeMs ?? WHATSAPP_OPERATIONS_HEARTBEAT_MAX_AGE_MS;
  if (!input.currentTime) return { ready: false, code: "database_clock_unavailable" };
  if (!input.expectedReleaseSha || !/^[0-9a-f]{40}$/.test(input.expectedReleaseSha)) {
    return { ready: false, code: "web_release_unavailable" };
  }
  if (input.outboundEnabled !== true) return { ready: false, code: "outbound_disabled" };
  if (!input.heartbeat?.lastSucceededAt) return { ready: false, code: "worker_not_started" };
  if (input.heartbeat.lastErrorCode) return { ready: false, code: "worker_failed" };
  if (input.heartbeat.releaseSha !== input.expectedReleaseSha) {
    return { ready: false, code: "worker_release_mismatch" };
  }
  const ageMs = input.currentTime.getTime() - input.heartbeat.lastSucceededAt.getTime();
  if (ageMs < -60_000 || ageMs >= maxAgeMs) return { ready: false, code: "worker_stale" };
  // A commerce-only heartbeat proves store maintenance, not outbound delivery.
  // Legacy or incomplete telemetry must not authorize a campaign launch.
  const details = input.heartbeat.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return { ready: false, code: "worker_outbound_unverified" };
  }
  const operation = details as Record<string, unknown>;
  const stages = operation.completedStages;
  if (operation.mode !== "full" || operation.state !== "succeeded"
    || !Array.isArray(stages)
    || !["whatsapp:campaigns", "whatsapp:deliveries"].every((stage) => stages.includes(stage))) {
    return { ready: false, code: "worker_outbound_unverified" };
  }
  return {
    ready: true,
    code: "ready",
    lastSucceededAt: input.heartbeat.lastSucceededAt,
    releaseSha: input.heartbeat.releaseSha,
  };
}
