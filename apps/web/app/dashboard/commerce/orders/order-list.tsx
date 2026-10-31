"use client";
import { useActionState } from "react";
import { listStoreOrders, type OrderListState } from "./actions";
const statusLabels: Record<string, [string, string]> = {
  paid: ["مدفوع", "Paid"], pending: ["بانتظار الدفع", "Pending payment"], under_review: ["قيد المراجعة", "Under review"], in_progress: ["قيد التنفيذ", "In progress"], completed: ["مكتمل", "Completed"], delivered: ["تم التسليم", "Delivered"], shipped: ["تم الشحن", "Shipped"], cancelled: ["ملغي", "Cancelled"], refunded: ["مسترد", "Refunded"],
  eligible: ["مؤهل للحجز", "Eligible for booking"], payment_unknown: ["دليل الدفع غير متوفر", "Payment evidence missing"], payment_unconfirmed: ["الدفع غير مؤكد", "Payment unconfirmed"], order_unconfirmed: ["حالة الطلب غير مؤهلة", "Order status not eligible"], order_revoked: ["طلب ملغي أو مسترد", "Cancelled or refunded order"], phone_missing: ["جوال الطلب مفقود", "Order phone missing"],
};
export function StoreOrderList({ initial, english }: { initial: OrderListState; english: boolean }) {
  const [state, action, pending] = useActionState(listStoreOrders, initial);
  const t = (ar: string, en: string) => english ? en : ar;
  const label = (value: string | null) => value ? statusLabels[value]?.[english ? 1 : 0] ?? value : t("غير متوفر", "Unavailable");
  const date = (value: string | null) => value ? new Date(value).toLocaleString(english ? "en-GB" : "ar-SA", { timeZone: "Asia/Riyadh" }) : t("غير متوفر", "Unavailable");
  const field = "min-h-11 rounded-xl border border-slate-400/50 bg-transparent px-3 py-2";
  return <div>
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-2 text-sm">{t("معرّف الطلب أو جوال العميل", "Order ID or customer phone")}<input name="query" maxLength={160} autoComplete="off" className={field} placeholder={t("جوال محلي أو دولي، أو معرّف الطلب", "Phone or order ID")} /></label>
        <label className="grid gap-2 text-sm">{t("المنصة", "Platform")}<select name="provider" className={field}><option value="">{t("جميع المتاجر المرتبطة", "All connected stores")}</option><option value="salla">Salla</option><option value="shopify">Shopify</option><option value="woocommerce">WooCommerce</option></select></label>
        <label className="grid gap-2 text-sm">{t("أهلية الحجز", "Booking eligibility")}<select name="eligibility" className={field}><option value="">{t("الكل", "All")}</option><option value="yes">{t("مؤهل", "Eligible")}</option><option value="no">{t("يحتاج مراجعة", "Needs review")}</option></select></label>
      </div>
      <button name="page" value="0" disabled={pending} className="min-h-11 rounded-xl bg-teal-800 px-6 font-bold text-white disabled:opacity-50">{pending ? t("جارٍ التحميل…", "Loading…") : t("بحث وتحديث العرض", "Search and refresh view")}</button>
      <p role="status" aria-live="polite" className="text-sm">{state.code === "unavailable" ? t("تعذر تحميل الطلبات. أعد المحاولة؛ لم نعتبرها قائمة فارغة.", "Orders could not be loaded. Retry; this is not an empty result.") : state.code !== "ok" ? t("لا يمكن عرض النتائج بهذه الصلاحيات أو المدخلات.", "Cannot display results with this access or input.") : t(`${state.rows.length} طلبًا في الصفحة ${state.page + 1}`, `${state.rows.length} orders on page ${state.page + 1}`)}</p>
      {state.code === "ok" && !state.rows.length ? <p className="rounded-xl border p-5">{t("لا توجد نتائج مطابقة في السجل المتزامن. تأكد من الجوال ومعرّف الطلب والمرشحات، أو حدّث الطلبات من إعدادات الربط.", "No matching synced records. Check the phone, order ID and filters, or sync orders in connection settings.")}</p> : null}
      <div aria-busy={pending} className="grid gap-4 md:grid-cols-2">
        {state.rows.map(o => <article key={o.key} className="min-w-0 rounded-2xl border border-slate-400/30 p-5">
          <div className="flex flex-wrap justify-between gap-2"><h2 className="break-all font-bold">{t("معرّف الطلب", "Order ID")} #{o.id}</h2><span className="text-sm">{o.store} · {o.provider}</span></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><dt>{t("الجوال", "Phone")}</dt><dd dir="ltr" className="break-all">{o.phone ?? "—"}</dd><dt>{t("حالة الطلب", "Order status")}</dt><dd>{label(o.status)}</dd><dt>{t("حالة الدفع", "Payment status")}</dt><dd>{label(o.payment)}</dd><dt>{t("أهلية الحجز", "Booking eligibility")}</dt><dd className="font-bold">{label(o.reason)}</dd><dt>{t("آخر تحديث من المتجر", "Store update")}</dt><dd>{date(o.updated)}</dd><dt>{t("آخر مزامنة للسجل", "Record synced")}</dt><dd>{date(o.synced)}</dd></dl>
          <details className="mt-4 text-sm"><summary className="cursor-pointer py-2 font-bold">{t("ماذا أفعل الآن؟", "What next?")}</summary><p className="leading-7">{o.reason === "eligible" ? t("يمكن تجربة الحجز مع مراعاة ساعات العمل والسعة وعدم وجود حجز نشط. أهلية الطلب لا تعني وصول رسالة واتساب.", "Try booking subject to availability, capacity and no active appointment. Eligibility does not prove WhatsApp delivery.") : t("راجع الدفع وحالة الطلب والجوال في المتجر ثم حدّث المزامنة. ربط رقم ميتا لا يغيّر أهلية الطلب.", "Check payment, order status and phone in the store, then refresh sync. Linking Meta does not change order eligibility.")}</p></details>
        </article>)}
      </div>
      <div className="flex gap-3"><button name="page" value={state.page - 1} disabled={pending || state.page === 0} className={`${field} disabled:opacity-40`}>{t("السابق", "Previous")}</button><button name="page" value={state.page + 1} disabled={pending || !state.more} className={`${field} disabled:opacity-40`}>{t("التالي", "Next")}</button></div>
    </form>
  </div>;
}
