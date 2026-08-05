import { ArrowRight, Check, Sparkles } from "lucide-react";
import Navbar from "./components/navbar";
import { BusinessTypesSection } from "./components/business-types-section";
import { Footer } from "./components/footer";
import { PhonePreview } from "./components/phone-preview";
import { SectionHeading } from "./components/section-heading";

const features = [
  {
    title: "واجهة احترافية",
    description: "أنشئ صفحة نشاط متكاملة بصرياً مع هوية واضحة وسهلة للزوار.",
  },
  {
    title: "إدارة الطلبات",
    description: "استقبل الطلبات مباشرة، تابعها، وراجع الحالة في لوحة تحكم واحدة.",
  },
  {
    title: "حملات تسويقية",
    description: "أطلق العروض والرسائل التسويقية من نفس المنصة دون تعقيد.",
  },
];

const stats = [
  { value: "24/7", label: "تواصل دائم" },
  { value: "3x", label: "سرعة التنفيذ" },
  { value: "100%", label: "مرونة للإدارة" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#eef2ff_0%,#f8fafc_45%,#f8fafc_100%)] text-slate-900">
      <Navbar />

      <section id="home" className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
        <div className="text-right">
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
            منصة الأعمال الذكية في السعودية 🇸🇦
          </span>

          <h1 className="mt-6 text-4xl font-black leading-[1.5] text-slate-950 md:text-5xl lg:text-6xl">
            الهوية الرقمية
            <br />
            <span className="text-indigo-600">لنشاطك التجاري</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-600 md:text-xl">
            أنشئ صفحة أعمال احترافية، اعرض منتجاتك، استقبل الطلبات، وادِر حملاتك التسويقية من واجهة واحدة سهلة وسريعة.
          </p>

          <div className="mt-8 flex flex-wrap justify-end gap-4">
            <button className="rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:bg-indigo-700">
              إنشاء نشاط
            </button>
            <button className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-base font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700">
              مشاهدة مثال
            </button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-center shadow-sm">
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <PhonePreview />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeading
          eyebrow="المزايا"
          title="كل ما تحتاجه لإدارة نشاطك"
          description="منصة HEE مصممة لتكون مساحة موحدة لإدارة أعمالك بواجهة احترافية، تجربة واضحة، وعمليات متسلسلة من الطلب إلى التوصيل والقياس."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-xl text-indigo-700">
                ✦
              </div>
              <h3 className="text-xl font-black text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-base leading-8 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <BusinessTypesSection />

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-14">
        <SectionHeading
          eyebrow="الأسعار"
          title="خطط مرنة لبداية احترافية"
          description="اختر الباقة المناسبة لنشاطك، ثم توسع مع الزمن دون إعادة بناء النظام أو تبديل الواجهة."
        />

        <div className="mt-10 rounded-[32px] bg-slate-950 px-6 py-10 text-white shadow-2xl shadow-slate-900/20">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-white/5 p-6">
              <p className="text-sm text-slate-300">الباقة الأساسية</p>
              <h3 className="mt-2 text-2xl font-black">مجانية</h3>
              <p className="mt-3 text-slate-400">للمشاريع الصغيرة والاختبار</p>
            </div>
            <div className="rounded-3xl bg-indigo-500 p-6 ring-2 ring-white/25">
              <div className="flex items-center justify-between">
                <p className="text-sm text-indigo-100">الباقة المميزة</p>
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">الأكثر طلباً</span>
              </div>
              <h3 className="mt-2 text-2xl font-black">299 ريال</h3>
              <p className="mt-3 text-indigo-50">للمتاجر التي تحتاج إدارة متقدمة</p>
            </div>
            <div className="rounded-3xl bg-white/5 p-6">
              <p className="text-sm text-slate-300">الباقة الاحترافية</p>
              <h3 className="mt-2 text-2xl font-black">599 ريال</h3>
              <p className="mt-3 text-slate-400">للمجموعات الكبيرة والتوسع السريع</p>
            </div>
          </div>
        </div>
      </section>

      <section id="cta" className="mx-auto max-w-7xl px-6 pb-20 pt-2">
        <div className="rounded-[32px] border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-8 text-center shadow-sm">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            ابدأ اليوم
          </div>
          <h2 className="mt-4 text-3xl font-black text-slate-950">حول فكرتك إلى منصة تجارية جاهزة</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> إعداد سريع</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> واجهة عربية</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> جاهز للتوسع</span>
          </div>
          <button className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/25">
            اطلب جلسة تجريبية
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}