import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactRound, FileText, Link2, MessageCircle, Megaphone, ShieldCheck, ShoppingBag, Workflow } from "lucide-react";
import { db } from "../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../lib/whatsapp/rbac";

type SectionState = "ready" | "attention" | "empty";

export default async function WhatsAppMarketingPage() {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const [connection, contacts, templates, campaigns, automations, conversations, integrations] = await Promise.all([
    db.whatsAppConnection.findFirst({ where: { businessId: context.businessId, provider: "meta" }, select: { status: true, disabledAt: true, displayPhoneNumber: true, verifiedName: true } }),
    db.whatsAppContact.count({ where: { businessId: context.businessId } }),
    db.whatsAppTemplate.count({ where: { businessId: context.businessId, provider: "meta", status: "approved" } }),
    db.whatsAppCampaign.count({ where: { businessId: context.businessId } }),
    db.whatsAppAutomation.count({ where: { businessId: context.businessId } }),
    db.whatsAppConversation.count({ where: { businessId: context.businessId } }),
    db.whatsAppCommerceIntegration.count({ where: { businessId: context.businessId } }),
  ]);
  const connected = connection?.status === "connected" && !connection.disabledAt;
  const cards = [
    { href: "/dashboard/whatsapp/contacts", title: "جهات الاتصال والاستيراد", text: "استيراد CSV أو Excel حتى 10,000 صف مع E.164 وإزالة التكرار والموافقة الصريحة.", icon: ContactRound, state: contacts ? "ready" : "empty", status: contacts ? `${contacts} جهة اتصال` : "ابدأ بالاستيراد" },
    { href: "/dashboard/whatsapp/templates", title: "قوالب Meta", text: "مزامنة القوالب الرسمية ومتابعة Approved وPending وRejected.", icon: FileText, state: templates ? "ready" : connected ? "attention" : "empty", status: templates ? `${templates} قالب معتمد` : connected ? "تحتاج مزامنة" : "اربط الرقم أولًا" },
    { href: "/dashboard/whatsapp/campaigns", title: "الحملات الجماعية", text: "إنشاء الحملة وأخذ Snapshot ثم الجدولة أو الإرسال عبر Queue وWorkers.", icon: Megaphone, state: connected && templates && contacts ? "ready" : "attention", status: connected && templates && contacts ? "جاهز للتجهيز" : "متطلبات ناقصة" },
    { href: "/dashboard/whatsapp/automations", title: "الأتمتة الذكية", text: "تشغيل قوالب Meta من أحداث موثوقة عبر Queue مع إعادة فحص الموافقة وOpt-out.", icon: Workflow, state: connected && templates ? "ready" : "attention", status: automations ? `${automations} أتمتة` : connected && templates ? "متاح للإنشاء" : "يتطلب ربطًا وقالبًا" },
    { href: "/dashboard/whatsapp/integrations", title: "تكاملات المتاجر", text: "Shopify رسميًا، مع إبقاء Salla وZid مغلقين كمسودة حتى اكتمال adapters الرسمية.", icon: ShoppingBag, state: integrations ? "ready" : "empty", status: integrations ? `${integrations} تكامل` : "لا توجد تكاملات" },
    { href: "/dashboard/whatsapp/inbox", title: "خدمة العملاء", text: "إدارة المحادثات والرد ضمن نافذة الخدمة الرسمية.", icon: MessageCircle, state: connected ? "ready" : "attention", status: connected ? `${conversations} محادثة` : "اربط الرقم أولًا" },
    { href: "/dashboard/whatsapp/setup", title: "ربط الرقم الرسمي", text: "Embedded Signup لربط WABA ورقم Meta الخاصين بالمنشأة.", icon: Link2, state: connected ? "ready" : "attention", status: connected ? "متصل رسميًا" : "يتطلب ربط Meta" },
    { href: "/dashboard/whatsapp/audit", title: "الأمان والتدقيق", text: "مراجعة العمليات الحساسة دون عرض الرموز أو محتوى الرسائل.", icon: ShieldCheck, state: "ready", status: "فعال" },
  ] as const;

  return <div className="space-y-4 pb-5">
    <header className="rounded-[26px] border border-[#e7e9f4] bg-white p-5"><span className="text-xs font-black text-emerald-600">WhatsApp Business Platform / Cloud API</span><h1 className="mt-2 text-2xl font-black text-[#20264f]">التسويق وخدمة العملاء عبر واتساب</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">أرسل حملات القوالب المعتمدة وأدر المحادثات من رقم منشأتك الرسمي. كل بطاقة أدناه تعرض حالتها الفعلية من قاعدة البيانات؛ لا نعرض وظيفة على أنها جاهزة قبل اكتمال متطلباتها.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Metric label="حالة الرقم" value={connected ? "متصل" : "غير متصل"} note={connection?.verifiedName || connection?.displayPhoneNumber || "يتطلب Embedded Signup"} />
      <Metric label="جهات الاتصال" value={String(contacts)} /><Metric label="قوالب معتمدة" value={String(templates)} /><Metric label="الحملات" value={String(campaigns)} /><Metric label="الأتمتة" value={String(automations)} /><Metric label="المحادثات" value={String(conversations)} />
    </section>
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{cards.map(({ href, title, text, icon: Icon, state, status }) => <Link key={href} href={href} className="group rounded-[24px] border border-[#e7e9f4] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#cfc3f5] hover:shadow-lg"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f2eeff] text-[#6843d0]"><Icon className="h-5 w-5" /></span><Status state={state} label={status} /></div><h2 className="mt-4 font-black text-[#20264f]">{title}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{text}</p><span className="mt-4 inline-block text-xs font-black text-[#6543ce]">فتح القسم ←</span></Link>)}</section>
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) { return <article className="rounded-[20px] border border-[#e7e9f4] bg-white p-4"><span className="text-[10px] font-bold text-slate-400">{label}</span><b className="mt-1 block text-xl font-black text-[#20264f]">{value}</b>{note ? <span className="mt-1 block truncate text-[10px] text-slate-400">{note}</span> : null}</article>; }

function Status({ state, label }: { state: SectionState; label: string }) {
  const classes = state === "ready" ? "bg-emerald-50 text-emerald-700" : state === "attention" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${classes}`}>{label}</span>;
}
