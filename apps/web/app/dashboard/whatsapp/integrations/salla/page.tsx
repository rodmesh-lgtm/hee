import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, MessageCircle, PackageCheck, ShieldCheck, Store } from "lucide-react";
import { db } from "../../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";

export default async function SallaAutomationPage() {
  const context = await getWhatsAppReadContext("connection.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");

  const stores = await db.whatsAppCommerceIntegration.findMany({
    where: { businessId: context.businessId, provider: "salla" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, displayName: true, externalStoreId: true, status: true },
  });

  return <div className="min-w-0 space-y-5 pb-8">
    <header className="rounded-[28px] bg-[#07181b] p-5 text-white sm:p-7">
      <span className="text-[9px] font-black tracking-[.18em] text-[#58e6d2]" dir="ltr">INFRO × SALLA</span>
      <h1 className="mt-3 text-2xl font-black sm:text-3xl">اشتراكات سلة المؤتمتة</h1>
      <p className="mt-2 max-w-3xl text-xs leading-7 text-slate-300 sm:text-sm">اربط المنتج بدفعة اشتراك لها تاريخ بداية موحد، ثم سجّل المشتري بعد تأكيد الدفع وأرسل له واتساب تلقائيًا عبر مسار INFRO الآمن.</p>
    </header>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card icon={<Store className="h-5 w-5" />} title="متجر سلة" text={`${stores.length} متجر مسجل لهذا النشاط`} />
      <Card icon={<PackageCheck className="h-5 w-5" />} title="المنتج والدفعة" text="Product ID + السعة + تاريخ بداية موحد" />
      <Card icon={<MessageCircle className="h-5 w-5" />} title="واتساب" text="Template معتمد بعد تأكيد الدفع" />
      <Card icon={<CalendarClock className="h-5 w-5" />} title="التفعيل" text="SCHEDULED ثم ACTIVE في الموعد" />
    </section>

    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e9fbf8] text-[#008f87]"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-black text-slate-950">حالة التشغيل</h2><p className="mt-1 text-xs leading-6 text-slate-500">واجهة الخدمة جاهزة كبداية، لكن إنشاء دفعات حقيقية سيظل مغلقًا حتى يكتمل OAuth وWebhooks الرسمية لسلة. لن تعرض INFRO ربطًا وهميًا للعميل.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{stores.length ? stores.map(store => <div key={store.id} className="rounded-2xl bg-slate-50 p-4"><b className="text-xs text-slate-900">{store.displayName || "متجر سلة"}</b><code dir="ltr" className="mt-1 block break-all text-[10px] text-slate-500">{store.externalStoreId}</code><span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">{store.status === "active" ? "متصل" : "بانتظار الربط الرسمي"}</span></div>) : <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs leading-6 text-slate-500">لم يُسجل متجر سلة لهذا النشاط بعد.</div>}</div>
      <Link href="/dashboard/whatsapp/integrations" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#07181b] px-4 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2">إدارة تكاملات المتاجر</Link>
    </section>
  </div>;
}

function Card({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#effbf9] text-[#008f87]">{icon}</span><h2 className="mt-4 text-sm font-black text-slate-950">{title}</h2><p className="mt-1 text-[11px] leading-6 text-slate-500">{text}</p></article>; }
