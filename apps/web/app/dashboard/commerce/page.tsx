import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequestLocale } from "../../lib/i18n-server";
import { getWhatsAppReadContext } from "../../lib/whatsapp/rbac";

export default async function CommercePage() {
  if (!await getWhatsAppReadContext("connection.manage")) redirect("/dashboard");
  const english = await getRequestLocale() === "en";
  const t = (ar: string, en: string) => english ? en : ar;
  const stores = [
    { name: "Salla · سلة", href: "/dashboard/commerce/salla", detail: t("ربط المتجر، إعداد واتساب وفحص أهلية الحجز للطلبات المكتملة أو المدفوعة والمؤكدة.", "Connect your store, set up WhatsApp and check booking eligibility for completed or paid confirmed orders.") },
    { name: "Shopify", href: "/dashboard/working-hours", detail: t("إعداد ربط Shopify ومزامنة الطلبات والتحقق من جاهزية الخدمة في حسابك.", "Configure Shopify, order synchronization and service readiness for your account.") },
    { name: "WooCommerce", href: "/dashboard/working-hours", detail: t("ربط متجر WooCommerce بمفتاح قراءة ومزامنة أهلية الطلبات.", "Connect WooCommerce with a read-only key and sync order eligibility.") },
  ];
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header><p className="text-sm font-bold tracking-wide">INFRO · COMMERCE</p><h1 className="mt-2 text-3xl font-bold">{t("تكاملات المتاجر", "Store integrations")}</h1><p className="mt-3 leading-7">{t("ابدأ باختيار منصة متجرك، ثم راجع طلباته وشغّل الخدمات المناسبة لمنشأتك.", "Choose your store platform, review its orders, then enable the services your business needs.")}</p></header>
    <nav className="flex flex-wrap gap-3"><Link className="rounded-xl bg-teal-800 px-5 py-3 font-bold text-white" href="/dashboard/commerce/orders">{t("استعراض الطلبات والبحث بالجوال", "Browse orders and search by phone")}</Link><Link className="rounded-xl border px-5 py-3" href="/dashboard/working-hours#visitor-booking-verification">{t("إعداد المواعيد ورموز التحقق", "Appointments and verification codes")}</Link></nav>
    <section className="grid gap-4 sm:grid-cols-2">{stores.map(store => <article key={store.name} className="rounded-2xl border border-slate-400/40 p-5"><h2 className="text-xl font-bold">{store.name}</h2><p className="my-3 leading-7">{store.detail}</p><Link className="inline-flex min-h-11 items-center font-bold underline" href={store.href}>{t("فتح الإعدادات", "Open settings")}</Link></article>)}<article className="rounded-2xl border border-slate-400/40 p-5"><h2 className="text-xl font-bold">Zid · زد</h2><p className="mt-3 leading-7">{t("الربط المباشر غير متاح حاليًا. سيظهر خيار الربط عند اكتمال اعتماد التكامل.", "Direct connection is not available yet. Setup will be offered when the integration is ready.")}</p></article></section>
  </main>;
}
