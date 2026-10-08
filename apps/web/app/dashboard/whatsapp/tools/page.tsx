import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactRound, Megaphone, PackageSearch, ShoppingCart, Workflow, MessageCircle, ShieldBan, ListFilter, Clock3, Monitor, BookOpen, Plug, Headphones, CreditCard, FileText, CalendarDays, BarChart3, Link2, ShieldCheck, Search } from "lucide-react";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { workspaceSearchMatches } from "../../../lib/whatsapp/workspace-search";
import { WorkspaceHeading, WorkspaceEmpty } from "../_components/workspace-ui";
const groups = [
  { title: "الجمهور والرسائل", description: "جهّز قائمة العملاء والرسالة، ثم تابع التسليم.", items: [
    { title: "تقارير الأداء", text: "مراجعة التسليم والقراءة والنقرات والردود والحجوزات المنسوبة للحملات.", href: "/dashboard/whatsapp/insights", icon: BarChart3 },
    { title: "الروابط المختصرة", text: "إنشاء روابط أعمال قصيرة وتعديلها ومتابعة نقراتها وتصديرها.", href: "/dashboard/whatsapp/links", icon: Link2 },
    { title: "كاروسيل منتجات واتساب", text: "إنشاء قالب بطاقات منتجات Meta واختيار منتجات الكتالوج داخل الحملات.", href: "/dashboard/whatsapp/carousel", icon: ShoppingCart },
    { title: "قائمة العملاء والشرائح", text: "استيراد الجمهور، توثيق الموافقة، اختيار مجموعات العملاء وحذف الجهات المحددة.", href: "/dashboard/whatsapp/contacts", icon: ContactRound },
    { title: "القوالب ومراجعة Meta", text: "قوالب مخصصة ونماذج عربية، مع متابعة اعتماد الرسائل ووسائطها.", href: "/dashboard/whatsapp/templates", icon: FileText },
    { title: "الحملات الترويجية", text: "اختيار الرقم والجمهور والقالب، معاينة الرسالة، ثم الجدولة والتقرير المباشر.", href: "/dashboard/whatsapp/campaigns", icon: Megaphone },
    { title: "حملات منتجات سلة", text: "اختيار منتجات متجرك وإدراج الاسم والسعر والرابط في متغيرات القالب المعتمد.", href: "/dashboard/whatsapp/campaigns?new=1#new-campaign", icon: PackageSearch },
    { title: "سجل الرسائل", text: "بحث في الوارد والصادر مع حالات التسليم والقراءة والتصدير.", href: "/dashboard/whatsapp/messages", icon: ListFilter },
    { title: "قائمة منع الإرسال", text: "مراجعة الأرقام المنسحبة وإضافة رقم إلى المنع داخل منشأتك.", href: "/dashboard/whatsapp/blacklist", icon: ShieldBan },
  ] },
  { title: "المتاجر وخدمة العملاء", description: "اربط الأحداث، نظّم المتابعة، وسهّل الزيارة.", items: [
    { title: "مركز الذكاء الاصطناعي", text: "جاهزية المساعد، استخدام البوت اليومي وسجل الردود والتحويل لفريقك.", href: "/dashboard/whatsapp/ai", icon: BarChart3 },
    { title: "بوت المحادثات", text: "أسئلة معتمدة أو معرفة منشأتك مع تجربة الردود والتحويل لفريق خدمة العملاء.", href: "/dashboard/whatsapp/bots", icon: Headphones },
    { title: "السلال المتروكة", text: "حالات السلال والعملاء الذين يحتاجون متابعة حسب بيانات المتجر.", href: "/dashboard/whatsapp/carts", icon: ShoppingCart },
    { title: "الأتمتة", text: "رسائل الترحيب والمتابعة والسلال من أحداث موثوقة وقوالب معتمدة.", href: "/dashboard/whatsapp/automations", icon: Workflow },
    { title: "صندوق المحادثات", text: "ردود الموظفين، سياق العميل وإدارة نافذة الخدمة.", href: "/dashboard/whatsapp/inbox", icon: MessageCircle },
    { title: "الفرز والمتابعة", text: "المسؤول والأولوية والمهل لمحادثات خدمة العملاء.", href: "/dashboard/whatsapp/inbox/operations", icon: Headphones },
    { title: "التذكيرات", text: "جدولة تذكيرات العمل ومتابعة القنوات وحالة التنفيذ.", href: "/dashboard/reminders", icon: Clock3 },
    { title: "المواعيد والفروع", text: "ترتيب الحجوزات القادمة والجديدة وإعداد الفترات وسعة الفروع.", href: "/dashboard/appointments", icon: CalendarDays },
    { title: "تكاملات المتاجر", text: "الربط الرسمي ومتابعة أحداث المتاجر ومزامنة بياناتها.", href: "/dashboard/whatsapp/integrations", icon: Plug },
  ] },
  { title: "التشغيل والمساعدة", description: "إدارة الحساب والاشتراك والوصول إلى الشروحات.", items: [
    { title: "ربط واتساب", text: "ربط رقم المنشأة عبر Meta ومراجعة حالته أو فصل الرقم.", href: "/dashboard/whatsapp/setup", icon: Link2 },
    { title: "سجل التدقيق", text: "مراجعة عمليات الربط والحملات والتصدير ومن نفّذها داخل المنشأة.", href: "/dashboard/whatsapp/audit", icon: ShieldCheck },
    { title: "جلسات الدخول", text: "رؤية جلسات الحساب النشطة وإنهاء الجلسات الأخرى.", href: "/dashboard/settings/sessions", icon: Monitor },
    { title: "الفوترة والاشتراك", text: "الخطة الحالية وحالة المدفوعات والفواتير المتاحة لحسابك.", href: "/dashboard/billing/manage", icon: CreditCard },
    { title: "الدعم والمساعدة", text: "إنشاء طلب دعم ومتابعة المشكلة مع فريق INFRO.", href: "/dashboard/support?context=whatsapp", icon: Headphones },
    { title: "الشروحات", text: "خطوات الربط والحملات والمنتجات والمواعيد وسجل الرسائل.", href: "/dashboard/whatsapp/guides", icon: BookOpen },
  ] },
];
export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const category = groups.some(group => group.title === params.category) ? params.category : "all";
  const matching = groups.filter(group => category === "all" || group.title === category).map(group => ({ ...group, items: group.items.filter(item => workspaceSearchMatches(`${item.title} ${item.text}`, query)) })).filter(group => group.items.length);
  const count = matching.reduce((sum, group) => sum + group.items.length, 0);
  return <div className="wa-page" dir="rtl"><WorkspaceHeading eyebrow="مساحة أدواتك" title="مركز أدوات INFRO" description="كل أدوات التواصل والتسويق والتشغيل، مرتبة بحسب ما تريد إنجازه." action={<Link className="wa-button" href="/dashboard/whatsapp/guides">ابدأ من الشروحات</Link>}/>
    <section className="wa-panel" aria-label="البحث في أدوات INFRO"><form className="wa-filters"><label className="wa-search" htmlFor="tool-search">البحث في الأدوات<input id="tool-search" type="search" name="q" defaultValue={query} maxLength={80} placeholder="رسائل، روابط، تقارير…"/></label><div className="wa-ai-filter"><label htmlFor="tool-category">المجموعة</label><select id="tool-category" name="category" defaultValue={category}><option value="all">كل المجموعات</option>{groups.map(group => <option key={group.title} value={group.title}>{group.title}</option>)}</select></div><button className="wa-button"><Search size={17} aria-hidden="true"/>بحث</button>{query || category !== "all" ? <Link href="/dashboard/whatsapp/tools" className="wa-button wa-secondary">مسح التصفية</Link> : null}</form><p className="wa-note" role="status">{count.toLocaleString("ar-SA")} أداة متاحة في النتائج</p></section>
    {!count ? <WorkspaceEmpty title="لا توجد أدوات مطابقة" description="جرّب كلمة أقصر أو اعرض جميع المجموعات." href="/dashboard/whatsapp/tools" label="عرض جميع الأدوات"/> : null}
    {matching.map(group => <section key={group.title} className="wa-stack"><div className="wa-section-title"><div><h2>{group.title}</h2><p className="wa-note">{group.description}</p></div></div><div className="wa-tools-grid">{group.items.map(item => <article className="wa-tool-card" key={item.title}><span className="wa-tool-icon"><item.icon size={23} aria-hidden="true"/></span><h3>{item.title}</h3><p>{item.text}</p><Link href={item.href} aria-label={`فتح ${item.title}`} className="wa-text-link">فتح الأداة ←</Link></article>)}</div></section>)}</div>;
}
