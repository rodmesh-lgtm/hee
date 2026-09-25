export const SALLA_ORDER_SCENARIOS = [
  { status: "pending_payment", label: "بانتظار الدفع", detail: "تذكير العميل بطلبه غير المدفوع", message: "مرحبًا {{1}}، طلبك رقم {{3}} لدى {{2}} بانتظار إتمام الدفع." },
  { status: "under_review", label: "قيد المراجعة", detail: "طمأنة العميل بأن طلبه وصل", message: "مرحبًا {{1}}، استلمنا طلبك رقم {{3}} لدى {{2}} وهو قيد المراجعة." },
  { status: "in_progress", label: "قيد التجهيز", detail: "إشعار العميل ببدء تجهيز الطلب", message: "مرحبًا {{1}}، بدأ تجهيز طلبك رقم {{3}} لدى {{2}}." },
  { status: "ready", label: "جاهز", detail: "إبلاغ العميل بجاهزية طلبه", message: "مرحبًا {{1}}، طلبك رقم {{3}} لدى {{2}} أصبح جاهزًا." },
  { status: "shipped", label: "تم الشحن", detail: "متابعة رحلة الطلب بعد الشحن", message: "مرحبًا {{1}}، تم شحن طلبك رقم {{3}} من {{2}}." },
  { status: "delivering", label: "خرج للتوصيل", detail: "إشعار العميل بأن الطلب في الطريق", message: "مرحبًا {{1}}، طلبك رقم {{3}} من {{2}} خرج للتوصيل." },
  { status: "delivered", label: "تم التسليم", detail: "تأكيد وصول الطلب للعميل", message: "مرحبًا {{1}}، تم تسليم طلبك رقم {{3}} من {{2}}. شكرًا لاختيارك لنا." },
  { status: "completed", label: "مكتمل", detail: "ختام واضح لتجربة الطلب", message: "مرحبًا {{1}}، اكتمل طلبك رقم {{3}} لدى {{2}}. نسعد بخدمتك مجددًا." },
  { status: "cancelled", label: "ملغي", detail: "إبلاغ العميل بإلغاء الطلب", message: "مرحبًا {{1}}، تم إلغاء طلبك رقم {{3}} لدى {{2}}." },
  { status: "refunded", label: "مسترد", detail: "إشعار العميل بتسجيل الاسترداد", message: "مرحبًا {{1}}، سُجّل استرداد طلبك رقم {{3}} لدى {{2}}. يمكنك التواصل معنا للاستفسار." },
] as const;

export type SallaOrderScenarioStatus = typeof SALLA_ORDER_SCENARIOS[number]["status"];
export const SALLA_ORDER_DELAY_MINUTES = [0, 15, 30, 60, 180, 360, 1440] as const;

export function sallaOrderScenarioStatus(value: string | null | undefined): SallaOrderScenarioStatus | null {
  const aliases: Record<string, string> = { awaiting_payment: "pending_payment", payment_pending: "pending_payment", processing: "in_progress", canceled: "cancelled" };
  const status = aliases[value ?? ""] ?? value;
  return SALLA_ORDER_SCENARIOS.some(item => item.status === status) ? status as SallaOrderScenarioStatus : null;
}

export function sallaOrderStatusConfig(status: unknown, delayMinutes: unknown) {
  if (typeof status !== "string" || !SALLA_ORDER_SCENARIOS.some(item => item.status === status)
    || typeof delayMinutes !== "number" || !(SALLA_ORDER_DELAY_MINUTES as readonly number[]).includes(delayMinutes)) {
    throw new Error("SALLA_ORDER_SCENARIO_INVALID");
  }
  return { version: 1, orderStatus: status as SallaOrderScenarioStatus, delayMinutes } as const;
}

export function readSallaOrderStatusConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SALLA_ORDER_SCENARIO_INVALID");
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || Object.keys(record).some(key => !["version", "orderStatus", "delayMinutes"].includes(key))) throw new Error("SALLA_ORDER_SCENARIO_INVALID");
  return sallaOrderStatusConfig(record.orderStatus, record.delayMinutes);
}

export function sallaStatusEventMatches(subjectType: string, orderStatus: string | null) {
  const status = sallaOrderScenarioStatus(orderStatus);
  return status !== null && subjectType === `salla.order.status.${status}`;
}

export function isSallaOrderTrigger(triggerType: string) {
  return triggerType === "salla_order_confirmation" || triggerType === "salla_order_status";
}

export function sallaTemplatePreview(text: string, businessName: string) {
  return text.replaceAll("{{1}}", "أحمد").replaceAll("{{2}}", businessName).replaceAll("{{3}}", "1024");
}
