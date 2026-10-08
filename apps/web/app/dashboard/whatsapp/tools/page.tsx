import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactRound, Megaphone, PackageSearch, ShoppingCart, Workflow, MessageCircle, ShieldBan, ListFilter, Clock3, Monitor, BookOpen, Plug, Headphones, CreditCard, FileText, CalendarDays, BarChart3 } from "lucide-react";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { WorkspaceHeading } from "../_components/workspace-ui";
const groups = [
  { title: "الجمهور والرسائل", description: "جهّز قائمة العملاء والرسالة، ثم تابع التسليم.", items: [
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
    { title: "جلسات الدخول", text: "رؤية جلسات الحساب النشطة وإنهاء الجلسات الأخرى.", href: "/dashboard/settings/sessions", icon: Monitor },
    { title: "الفوترة والاشتراك", text: "الخطة الحالية وحالة المدفوعات والفواتير المتاحة لحسابك.", href: "/dashboard/billing/manage", icon: CreditCard },
    { title: "الدعم والمساعدة", text: "إنشاء طلب دعم ومتابعة المشكلة مع فريق INFRO.", href: "/dashboard/support?context=whatsapp", icon: Headphones },
    { title: "الشروحات", text: "خطوات الربط والحملات والمنتجات والمواعيد وسجل الرسائل.", href: "/dashboard/whatsapp/guides", icon: BookOpen },
  ] },
];
export default async function ToolsPage() {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  return <div className="wa-page" dir="rtl"><WorkspaceHeading eyebrow="مساحة أدواتك" title="مركز أدوات INFRO" description="كل أدوات التواصل والتسويق والتشغيل، مرتبة بحسب ما تريد إنجازه." action={<Link className="wa-button" href="/dashboard/whatsapp/guides">ابدأ من الشروحات</Link>}/>{groups.map(group => <section key={group.title} className="wa-stack"><div className="wa-section-title"><div><h2>{group.title}</h2><p className="wa-note">{group.description}</p></div></div><div className="wa-tools-grid">{group.items.map(item => <article className="wa-tool-card" key={item.title}><span className="wa-tool-icon"><item.icon size={23} aria-hidden="true"/></span><h3>{item.title}</h3><p>{item.text}</p><Link href={item.href} aria-label={`فتح ${item.title}`} className="wa-text-link">فتح الأداة ←</Link></article>)}</div></section>)}</div>;
}
