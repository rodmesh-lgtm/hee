"use client";
import { useActionState } from "react";
import { checkSallaBooking, type BookingCheckState } from "./booking-check-action";
const messages: Record<string, [string, string]> = {
  eligible: ["الرقم مؤهل من ناحية طلب سلة. يمكنه تجربة الحجز؛ تبقى شروط الوقت والسعة وعدم وجود حجز نشط.", "This phone has an eligible Salla order. Booking still depends on availability, capacity and no existing active appointment."],
  ineligible: ["وجدنا طلبًا لهذا الرقم، لكنه لا يحقق شروط الحجز:", "An order was found, but it does not meet the booking conditions:"],
  not_found: ["لم نجد طلبًا لهذا الرقم في سجل المتجر المتصل. طابق جوال العميل في سلة، ثم اختر تحديث الطلبات والفحص. المزامنة تفحص أحدث الطلبات ضمن حدها؛ غياب السجل ليس إثباتًا لعدم الشراء.", "No matching order was found in this connected store's local records. Check the customer phone in Salla, then refresh and check. Sync covers recent orders within its limit; absence does not prove no purchase."],
  payment_unknown: ["لم يصل دليل حالة الدفع في بيانات الطلب. تأكيد الطلب أو اختيار وسيلة الدفع وحده لا يثبت السداد.", "Order data has no payment status evidence. Order confirmation or payment method alone does not prove payment."],
  payment_unconfirmed: ["حالة الدفع المستلمة ليست سدادًا مؤكدًا.", "The received payment status does not confirm payment."],
  order_unconfirmed: ["حالة الطلب المستلمة ليست من الحالات المؤهلة للحجز.", "The received order status is not eligible for booking."],
  order_revoked: ["الطلب ملغي أو مسترد أو غير صالح.", "The order is cancelled, refunded or invalid."],
  phone_missing: ["رقم الجوال غير متاح في بيانات الطلب.", "The order phone is unavailable."],
  invalid_phone: ["أدخل رقمًا صحيحًا مثل 05xxxxxxxx أو +9665xxxxxxxx.", "Enter a valid phone such as 05xxxxxxxx or +9665xxxxxxxx."],
  forbidden: ["لا تملك صلاحية إدارة هذا الربط.", "You do not have permission to manage this connection."],
  rate_limited: ["انتظر دقيقة قبل إعادة الفحص.", "Wait a minute before checking again."],
  store_missing: ["اربط متجر سلة أولًا.", "Connect your Salla store first."],
  subscription_required: ["تحديث الطلبات يحتاج صلاحيات خدمة فعالة. تواصل مع الدعم.", "Refreshing orders requires active service access. Contact support."],
  connection_changed: ["تغير ربط المتجر أثناء الفحص. حدّث الصفحة وأعد المحاولة.", "The store connection changed. Refresh the page and try again."],
  unavailable: ["تعذر إكمال الفحص أو التحديث. لم نغيّر شروط قبول الحجز؛ أعد المحاولة أو تواصل مع الدعم.", "Check or sync failed. Booking rules remain unchanged. Retry or contact support."],
};
export function SallaBookingCheck({ english }: { english: boolean }) {
  const [state, action, pending] = useActionState(checkSallaBooking, { code: "" } as BookingCheckState);
  const t = (ar: string, en: string) => english ? en : ar;
  const message = (code: string) => messages[code]?.[english ? 1 : 0] ?? "";
  return <section id="booking-check" className="rounded-2xl border border-teal-700/40 p-5 sm:p-6">
    <h2 className="text-xl font-bold">{t("لماذا رُفض حجز العميل؟", "Why was a booking rejected?")}</h2>
    <p className="mt-2 text-sm leading-7 opacity-80">{t("افحص جوال العميل قبل التجربة. هذا فحص خاص بمنشأتك؛ لا ينشئ حجزًا ولا يرسل رسالة، ويقبل طلب سلة المكتمل أو المدفوع والمؤكد، ويستبعد الملغي والمسترد.", "Check the customer's phone before testing. This private check does not create a booking, send a message and accepts completed Salla orders or paid confirmed orders, excluding cancellations and refunds.")}</p>
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="grid flex-1 gap-2 text-sm font-bold">{t("جوال العميل المسجل في الطلب", "Customer phone on the order")}<input name="phone" type="tel" dir="ltr" autoComplete="off" required maxLength={40} placeholder="05xxxxxxxx" className="min-h-12 w-full rounded-xl border border-slate-400 bg-transparent px-3" /></label>
      <button disabled={pending} name="refresh" value="no" className="min-h-12 rounded-xl border border-teal-600 px-4 font-bold disabled:opacity-50">{pending ? t("جارٍ الفحص…", "Checking…") : t("فحص الأهلية", "Check eligibility")}</button>
      <button disabled={pending} name="refresh" value="yes" className="min-h-12 rounded-xl bg-teal-800 px-4 font-bold text-white disabled:opacity-50">{t("تحديث الطلبات والفحص", "Refresh orders and check")}</button>
    </form>
    <div role="status" aria-live="polite" className="mt-4 text-sm leading-7"><p>{message(state.code)}</p>{state.code === "ineligible" ? <ul className="list-inside list-disc">{state.reasons?.map(r => <li key={r}>{message(r)}</li>)}</ul> : null}{state.checkedAt ? <p className="mt-2 opacity-70">{t("وقت الفحص: ", "Checked: ")}{new Date(state.checkedAt).toLocaleString(english ? "en-GB" : "ar-SA", { timeZone: "Asia/Riyadh" })}</p> : null}</div>
  </section>;
}
