export const WHATSAPP_CARE_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type WhatsAppCarePriority = (typeof WHATSAPP_CARE_PRIORITIES)[number];

const SLA_MINUTES: Record<WhatsAppCarePriority, number> = {
  low: 480,
  normal: 240,
  high: 60,
  urgent: 15,
};

export function isWhatsAppCarePriority(value: string): value is WhatsAppCarePriority {
  return WHATSAPP_CARE_PRIORITIES.includes(value as WhatsAppCarePriority);
}

export function whatsAppCareSlaDueAt(priority: string, inboundAt: Date) {
  const safePriority = isWhatsAppCarePriority(priority) ? priority : "normal";
  return new Date(inboundAt.getTime() + SLA_MINUTES[safePriority] * 60_000);
}

export function whatsAppCareSlaState(input: {
  lastInboundAt: Date | null;
  lastOutboundAt: Date | null;
  slaDueAt: Date | null;
  slaRespondedAt: Date | null;
  now?: Date;
}) {
  if (!input.lastInboundAt || (input.lastOutboundAt && input.lastOutboundAt >= input.lastInboundAt)) {
    return { state: "answered" as const, dueAt: input.slaDueAt, overdue: false };
  }
  const dueAt = input.slaDueAt;
  if (!dueAt) return { state: "not-started" as const, dueAt: null, overdue: false };
  const overdue = dueAt.getTime() <= (input.now ?? new Date()).getTime();
  return { state: overdue ? "overdue" as const : "running" as const, dueAt, overdue };
}
