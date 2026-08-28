const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1_000;

export function whatsAppCustomerServiceWindow(lastInboundAt: Date | null, now = new Date()) {
  if (!lastInboundAt) return { open: false, closesAt: null, remainingMs: 0 };
  const closesAt = new Date(lastInboundAt.getTime() + CUSTOMER_SERVICE_WINDOW_MS);
  return { open: closesAt > now, closesAt, remainingMs: Math.max(0, closesAt.getTime() - now.getTime()) };
}
