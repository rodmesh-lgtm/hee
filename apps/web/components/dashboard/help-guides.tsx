"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpLeft, BookOpen, Search } from "lucide-react";
import { SUPPORT_CONTEXTS, type SupportContextKey } from "../../app/lib/support-context";

const guides: { context: SupportContextKey; title: string; category: string; steps: string[] }[] = [
  { context: "meta", title: "تجهيز اتصال واتساب", category: "واتساب", steps: ["افتح إعدادات الربط وراجع حالة اتصال حساب Meta ورقم الإرسال.", "تحقق من جاهزية إعدادات الإرسال. تفعيل الإرسال وحده لا يعني أن الرسالة وصلت.", "إذا تعذر الإرسال، احتفظ برمز الخطأ ووقت المحاولة وأرفقهما بطلب الدعم؛ لا تشارك رموز الدخول."] },
  { context: "templates", title: "مراجعة القالب قبل الحملة", category: "واتساب", steps: ["راجع نص القالب ومتغيراته وأزراره ومعاينته في قسم القوالب.", "انتظر ظهور اعتماد القالب قبل استخدامه للإرسال.", "إذا تغيرت حالة القالب، راجعها مجددًا قبل إطلاق الحملة."] },
  { context: "contacts", title: "تجهيز جمهور مسموح بالتواصل معه", category: "واتساب", steps: ["راجع أرقام جهات الاتصال ومصدرها وموافقتها على التواصل.", "استخدم المجموعات والفلاتر لاختيار الجمهور المناسب.", "لا تعِد إدراج من ألغى الاشتراك في جمهور الإرسال."] },
  { context: "campaigns", title: "متابعة الحملة وإيصالات التسليم", category: "واتساب", steps: ["راجع الجمهور والقالب وجاهزية الإرسال قبل إطلاق الحملة.", "افتح تقرير الحملة لمتابعة الانتظار والإرسال والتسليم والقراءة والفشل.", "اعتمد إيصال التسليم في تقييم الوصول؛ قبول طلب الإرسال لا يثبت تسليم الرسالة."] },
  { context: "dashboard", title: "قراءة الأداء وتحديث الأرقام", category: "الأعمال", steps: ["راجع الفترة المكتوبة فوق المؤشرات؛ لا تقارن أرقامًا من فترات مختلفة.", "تعرض الصفحة الرئيسية آخر قراءة بتوقيت الرياض، مع تحديث تلقائي يمكن إيقافه.", "افتح قسم الأداء لتغيير الفترة ومراجعة تفاصيل الزيارات والتفاعل."] },
  { context: "booking", title: "تنظيم الحجوزات وساعات العمل", category: "الأعمال", steps: ["راجع أيام وساعات العمل قبل مشاركة رابط الحجز.", "راجع مدة الخدمة والمواعيد المتاحة من قسم المواعيد.", "تابع الحجوزات المسجلة داخل المنشأة، وحدّث حالتها بعد معالجة الطلب."] },
  { context: "billing", title: "فهم الاشتراك وصلاحية المزايا", category: "الحساب", steps: ["افتح الاشتراك والفوترة لمراجعة الباقة وحالتها.", "إذا لم يظهر قسم متاح، راجع صلاحية حسابك ومزايا الباقة مع مسؤول المنشأة.", "أرسل طلب دعم مرتبطًا بالفوترة عند وجود اختلاف في الحالة، دون إرفاق بيانات بطاقة الدفع."] },
];
const categories = ["الكل", "واتساب", "الأعمال", "الحساب"];
function normalize(value: string) { return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").toLocaleLowerCase("ar"); }

export function HelpGuides() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const needle = normalize(query.trim());
  const visible = guides.filter(guide => (category === "الكل" || guide.category === category) && normalize([guide.title, ...guide.steps].join(" ")).includes(needle));
  return <section aria-labelledby="help-guides-title" className="infro-help-guides rounded-[26px] border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-start gap-3"><BookOpen aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#008f87]"/><div><h2 id="help-guides-title" className="text-lg font-black">أدلة تساعدك على إنجاز العمل</h2><p className="mt-1 text-sm leading-6 text-slate-500">خطوات عملية وروابط مباشرة إلى أدوات منشأتك. تبقى صلاحيات الحساب والباقة مطبقة عند فتح القسم.</p></div></div>
    <label className="mt-5 grid gap-2 text-sm font-bold"><span>البحث في أدلة المساعدة</span><span className="relative block"><Search aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-slate-400"/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن القالب، التسليم، الاشتراك…" className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-3 text-sm"/></span></label>
    <div aria-label="تصنيف أدلة المساعدة" className="mt-3 flex flex-wrap gap-2">{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded-xl border px-4 py-2 text-sm font-bold ${category === item ? "border-[#008f87] bg-[#effbf9] text-[#006b64]" : "border-slate-200 text-slate-500"}`}>{item}</button>)}</div>
    <p role="status" aria-live="polite" className="mt-3 text-sm text-slate-500">{visible.length} من {guides.length} أدلة</p>
    <div className="mt-4 grid gap-3 lg:grid-cols-2">{visible.map(guide => <details key={guide.context} className="min-w-0 rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-bold leading-6">{guide.title}</summary><ol className="mt-3 list-decimal space-y-2 pr-5 text-sm leading-7 text-slate-600">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol><div className="mt-4 flex flex-wrap gap-3"><Link href={SUPPORT_CONTEXTS[guide.context].path} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#effbf9] px-3 text-sm font-bold text-[#006b64]">فتح القسم<ArrowUpLeft aria-hidden="true" className="h-4 w-4"/></Link><Link href={`/dashboard/support?context=${guide.context}`} className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">طلب مساعدة بهذا القسم</Link></div></details>)}</div>
    {visible.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center"><p className="text-sm">لا توجد أدلة تطابق البحث والتصنيف.</p><button type="button" onClick={() => { setQuery(""); setCategory("الكل"); }} className="mt-2 px-4 text-sm font-bold text-[#008f87]">عرض جميع الأدلة</button></div> : null}
  </section>;
}
