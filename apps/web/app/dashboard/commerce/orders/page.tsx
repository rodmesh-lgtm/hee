import Link from "next/link";
import { redirect } from "next/navigation";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { getRequestLocale } from "../../../lib/i18n-server";
import { listStoreOrders } from "./actions";
import { StoreOrderList } from "./order-list";
export default async function StoreOrdersPage() {
  const context = await getWhatsAppReadContext("connection.manage");
  if (!context) redirect("/dashboard");
  const [locale, initial] = await Promise.all([getRequestLocale(), listStoreOrders({ code: "", page: 0, more: false, rows: [] }, new FormData())]);
  const english = locale === "en";
  const t = (ar: string, en: string) => english ? en : ar;
  return <main dir={english ? "ltr" : "rtl"} className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header><p className="text-sm font-bold">INFRO · Commerce</p><h1 className="mt-2 text-2xl font-black">{t("طلبات المتاجر المرتبطة", "Connected store orders")}</h1><p className="mt-3 text-sm leading-7">{t("طلبات منشأتك المتزامنة من سلة وShopify وWooCommerce، مرتبة حسب آخر تحديث من المتجر. هذا سجل المتابعة وأهلية الحجز؛ لا يعرض الفواتير أو كل تفاصيل الطلب الأصلية. معرّف الطلب هنا قد يختلف عن رقم العرض في المتجر.", "Your synced Salla, Shopify and WooCommerce orders, sorted by store update time. This is the tracking and booking eligibility record, not the complete original order or invoice. Order IDs may differ from the store's display number.")}</p></header>
    <nav className="flex flex-wrap gap-4 text-sm font-bold"><Link className="min-h-11 underline" href="/dashboard/commerce/salla">{t("بدء سلة وفحص الحجز", "Salla setup and booking check")}</Link><Link className="min-h-11 underline" href="/dashboard/working-hours">{t("ربط المتاجر وتحديث المزامنة", "Connections and order sync")}</Link><Link className="min-h-11 underline" href="/dashboard/appointments">{t("الحجوزات", "Appointments")}</Link></nav>
    <StoreOrderList key={context.businessId} initial={initial} english={english} />
  </main>;
}
