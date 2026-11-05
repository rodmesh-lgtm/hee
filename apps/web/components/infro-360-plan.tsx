"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { BarChart3, Building2, Check, Layers3, UsersRound } from "lucide-react";
import { useI18n } from "./i18n/locale-provider";

export function Infro360Plan({ workspace = false, canManage = false, seats }: {
  workspace?: boolean; canManage?: boolean; seats?: { used: number; pending: number; limit: number | null };
}) {
  const { locale } = useI18n();
  const arabic = locale === "ar";
  const t = (ar: string, en: string) => arabic ? ar : en;
  const [users, setUsers] = useState(1);
  const inputId = useId();
  const quote = (extra = false) => `https://wa.me/966564212464?text=${encodeURIComponent(extra
    ? `أرغب بعرض اشتراك لإضافة ${users} مستخدمين إلى INFRO 360. يرجى تحديد المدة والصلاحيات والتكلفة قبل التفعيل.`
    : "أرغب بعرض سعر لباقة INFRO 360 — مركز تحليلات الأعمال. أحتاج تحديد الحسابات والمنصات والمستخدمين وحجم البيانات والخدمات المشمولة.")}`;
  const features = [
    ["حساباتك المتعددة في مساحة واحدة", "Multiple accounts, one workspace", "نظرة مجمعة، ثم لوحة مستقلة لكل منصة وحساب؛ دون التنقل بين أنظمتك يوميًا.", "A consolidated overview and dedicated views per platform and account, without switching systems every day."],
    ["تفاصيل تساعدك على اتخاذ القرار", "Details that inform decisions", "المبيعات والمرتجعات والخصومات والمنتجات والمخزون، بحسب البيانات والصلاحيات المتاحة من المصدر.", "Sales, refunds, discounts, products and inventory, subject to source data and permissions."],
    ["تقارير أمامك، وقتما تحتاجها", "Reports at your fingertips", "اختر الحساب والفترة، استعرض التفاصيل داخل اللوحة، ثم اطبع أو صدّر التقارير المدعومة عند الحاجة.", "Filter by account and period, explore details in the dashboard, and print or export supported reports when needed."],
    ["متابعة تلقائية واضحة", "Transparent automatic refresh", "تحديث دوري للتقارير المدعومة مع وقت آخر قراءة وحالة الاتصال؛ وفق حدود كل مزود.", "Periodic updates for supported reports, with last-read time and connection status, within provider limits."],
    ["فريقك بالصلاحيات المناسبة", "The right access for your team", "حساب مستقل لكل مستخدم وصلاحية منفصلة للتقارير المالية. تُضاف المقاعد وفق الاشتراك المتفق عليه.", "Individual user accounts and explicit financial-report permissions. Seats are added under agreed subscription terms."],
    ["خدمات INFRO حسب احتياج منشأتك", "INFRO services tailored to your business", "يمكن تضمين الهوية الرقمية والمواعيد والكاشير والمحاسبة وواتساب والمشاهدة المؤقتة، بحدود وخدمات موضحة في عرضك.", "Your quote can include digital identity, appointments, POS, accounting, WhatsApp and temporary live viewing, with specified services and allowances."],
  ];
  return <section aria-label={t("باقة INFRO 360", "INFRO 360 plan")} className="my-8 overflow-hidden rounded-3xl border border-teal-300 bg-[#092d33] text-white shadow-xl" dir={arabic ? "rtl" : "ltr"}>
    <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_2fr]">
      <header>
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-sm text-teal-100"><Layers3 size={18}/>{t("باقة مخصصة للمنشآت متعددة الحسابات", "Built for businesses with multiple accounts")}</span>
        <h2 className="mt-5 text-4xl font-black">INFRO <span className="text-teal-300">360</span></h2>
        <p className="mt-3 text-xl font-bold">{t("مركز تحليلات الأعمال", "Business analytics hub")}</p>
        <p className="mt-4 leading-8 text-slate-200">{t("شاهد أعمالك مجتمعة، وافهم تفاصيل كل حساب. مساحة واحدة تخدم مختلف الأنشطة وتكبر مع فريقك.", "See your business together and understand each account. One workspace for different industries, built to grow with your team.")}</p>
        <a href={quote()} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-300 px-5 py-3 font-bold text-[#092d33]">{t("لطلب التسعير تواصل معنا", "Contact us for pricing")}</a>
        <p className="mt-3 text-sm leading-6 text-slate-300">{t("عرض مخصص بحسب الحسابات والمستخدمين وحجم البيانات. لا يبدأ اشتراك أو خصم عند طلب التسعير.", "A quote based on accounts, users and data volume. Requesting a quote does not start a subscription or charge.")}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">{features.map(([ar, en, detailAr, detailEn]) => <li key={en} className="rounded-2xl border border-white/10 bg-white/5 p-4"><Check className="mb-3 text-teal-300" size={20}/><h3 className="font-bold">{t(ar, en)}</h3><p className="mt-2 text-sm leading-7 text-slate-200">{t(detailAr, detailEn)}</p></li>)}</ul>
    </div>
    <div className="flex flex-wrap gap-4 border-t border-white/10 bg-black/10 px-6 py-4 text-sm sm:px-8"><span className="flex items-center gap-2"><BarChart3 size={18}/>{t("Shopify: تقارير الحسابات المرتبطة", "Shopify: connected-account reports")}</span><span className="flex items-center gap-2"><Building2 size={18}/>{t("Foodics وICG: بانتظار استكمال التكامل الرسمي", "Foodics and ICG: official integrations pending")}</span></div>
    <p className="px-6 py-4 text-sm leading-7 text-slate-300 sm:px-8">{t("يحدد العرض عدد الحسابات والمستخدمين، وحجم البيانات، ومدة الاحتفاظ وسرعة التحديث والخدمات المشمولة. رسوم Meta والمزودين الخارجيين منفصلة. لا تتكرر رسوم ربط الحسابات لمجرد إضافة مستخدم.", "The quote specifies accounts, users, data volume, retention, refresh cadence and included services. Meta and external provider fees are separate. Adding a user does not duplicate account connection charges.")}</p>
    {workspace && canManage ? <div className="border-t border-white/10 p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-xl font-bold"><UsersRound size={22}/>{t("المستخدمون الإضافيون", "Additional users")}</h3>
      {seats ? <p className="mt-3 text-sm">{t("المستخدمون الحاليون مع المالك", "Current users including owner")}: {seats.used} · {t("دعوات معلقة", "Pending invitations")}: {seats.pending} · {t("حد الاشتراك الحالي", "Current subscription limit")}: {seats.limit ?? t("وفق العقد السابق", "Per existing contract")}</p> : null}
      <p className="my-3 text-sm leading-7 text-slate-200">{t("اطلب عرضًا للمقاعد الإضافية، وبعد اعتماد الاشتراك وتفعيل سعته يمكنك دعوة الفريق. فتح محادثة التسعير لا يمنح مقاعد. تُحدد صلاحية التقارير المالية لكل مستخدم من إدارة الفريق.", "Request an extra-seat quote. Once the subscription and its capacity are activated, invite your team. Opening a pricing conversation grants no seats. Assign financial-report permission individually in team management.")}</p>
      <div className="flex flex-wrap items-end gap-3"><label htmlFor={inputId} className="text-sm">{t("عدد المستخدمين المطلوب إضافتهم", "Additional users requested")}<input id={inputId} type="number" min={1} max={1000} value={users} onChange={event => setUsers(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))} className="mt-2 block min-h-12 w-32 rounded-xl border border-white/30 bg-[#092d33] p-3 text-white"/></label><a href={quote(true)} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-teal-300 px-4 py-3 font-bold text-[#092d33]">{t("طلب اشتراك مستخدمين إضافيين", "Request additional-user subscription")}</a><Link href="/dashboard/staff" className="rounded-xl border border-teal-200/40 px-4 py-3 font-bold">{t("إدارة المستخدمين والصلاحيات", "Manage users and permissions")}</Link></div>
    </div> : null}
  </section>;
}
