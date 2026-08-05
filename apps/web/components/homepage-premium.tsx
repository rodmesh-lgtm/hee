"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Compass,
  MapPin,
  MessageCircle,
  Package,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";

type ActivityKey = "clinic" | "restaurant" | "workshop" | "store";

type ActivityOption = {
  id: ActivityKey;
  title: string;
  subtitle: string;
  icon: typeof CalendarDays;
  primaryAction: string;
  description: string;
  accent: string;
  modules: string[];
};

const activityOptions: ActivityOption[] = [
  {
    id: "clinic",
    title: "عيادة",
    subtitle: "حجز موعد",
    icon: CalendarDays,
    primaryAction: "احجز موعد",
    description: "عرض خدمات، مواعيد، وتواصل مباشر من صفحة واحدة.",
    accent: "from-emerald-600 to-teal-500",
    modules: ["الحجز", "الخدمات", "الموقع"],
  },
  {
    id: "restaurant",
    title: "مطعم",
    subtitle: "اطلب الآن",
    icon: UtensilsCrossed,
    primaryAction: "اطلب الآن",
    description: "أبرز القائمة والطلبات السريعة واتجاهات التواصل.",
    accent: "from-slate-700 to-slate-900",
    modules: ["المنتجات", "الموقع", "واتساب"],
  },
  {
    id: "workshop",
    title: "ورشة",
    subtitle: "حجز خدمة",
    icon: Wrench,
    primaryAction: "حجز خدمة",
    description: "اعرض خدمات الصيانة والمهام المتاحة بسهولة.",
    accent: "from-cyan-600 to-sky-500",
    modules: ["الخدمات", "الحجز", "ساعات العمل"],
  },
  {
    id: "store",
    title: "متجر",
    subtitle: "تصفح المنتجات",
    icon: ShoppingBag,
    primaryAction: "تصفح المنتجات",
    description: "انشر المنتجات، ارجع إلى المتجر الخارجي أو أظهر العروض.",
    accent: "from-violet-600 to-indigo-500",
    modules: ["المنتجات", "المتجر الخارجي", "الاتصال"],
  },
];

const controlModules = [
  { name: "المنتجات", active: true },
  { name: "الخدمات", active: true },
  { name: "الحجز", active: false },
  { name: "الموقع", active: true },
  { name: "ساعات العمل", active: false },
];

export function HomepagePremium() {
  const [activeActivity, setActiveActivity] = useState<ActivityKey>("clinic");

  const currentActivity = useMemo(() => activityOptions.find((item) => item.id === activeActivity) ?? activityOptions[0], [activeActivity]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-[56px] max-w-6xl items-center justify-between px-3 py-2 sm:px-6 sm:py-3">
          <Link href="/" className="flex items-center gap-2" aria-label="الانتقال إلى الصفحة الرئيسية">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f172a] text-sm font-black text-white">H</span>
            <span className="text-lg font-black tracking-tight">HEE</span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <a href="#how" className="text-sm font-semibold text-slate-700">كيف يعمل؟</a>
            <a href="#activity" className="text-sm font-semibold text-slate-700">الأمثلة</a>
            <a href="#pricing" className="text-sm font-semibold text-slate-700">الباقات</a>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-900">تسجيل الدخول</Link>
            <Link href="/register" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0f172a] px-4 text-sm font-bold text-white">أنشئ صفحتك</Link>
          </div>

          <details className="group relative lg:hidden">
            <summary className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-slate-900 list-none sm:h-11 sm:w-11">
              <span className="text-lg leading-none">☰</span>
            </summary>
            <div className="absolute left-0 top-14 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="space-y-1 pb-2">
                <a href="#how" className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">كيف يعمل؟</a>
                <a href="#activity" className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">الأمثلة</a>
                <a href="#pricing" className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">الباقات</a>
              </div>
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <Link href="/login" className="block rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-bold text-slate-900">تسجيل الدخول</Link>
                <Link href="/register" className="block rounded-lg bg-[#0f172a] px-3 py-2 text-center text-sm font-bold text-white">أنشئ صفحتك</Link>
              </div>
            </div>
          </details>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-4 px-3 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-7 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-8 lg:pt-8">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            صفحة أعمال ذكية في رابط واحد
          </p>
          <h1 className="mt-3 text-[1.85rem] font-black leading-[1.35] text-slate-950 sm:text-4xl lg:text-[3rem]">
            صمم صفحة عملك كما يناسبك، ثم شاركها بثقة
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            اعرض خدماتك، أضف منتجاتك، وفعّل التواصل والطلبات من صفحة واحدة تبدو احترافية ومناسبة لنشاطك السعودي.
          </p>
          <div className="mt-4 flex flex-col items-stretch gap-2 sm:mt-5 sm:flex-row sm:items-center sm:gap-3">
            <Link href="/register" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#0f172a] px-5 text-sm font-black text-white sm:w-auto">أنشئ صفحتك مجاناً</Link>
            <Link href="/demo" className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-2xl border border-slate-300 px-5 text-sm font-black text-slate-900 sm:w-auto">
              شاهد المثال
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:rounded-[28px] sm:p-3">
          <div className="rounded-[20px] bg-slate-50 p-2.5 sm:rounded-[22px] sm:p-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </div>

            <div className="mt-3 rounded-[16px] bg-white p-2.5 shadow-sm sm:rounded-[18px] sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">م</div>
                  <div>
                    <p className="text-sm font-black text-slate-900">مركز الندى</p>
                    <p className="text-[12px] text-slate-500">عيادة تجميل</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">موثّق</span>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">صفحة موثقة تعزز ثقة عملائك وتوضح خدماتك بوضوح.</p>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-700">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1"><MessageCircle className="h-3.5 w-3.5" /> واتساب</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1"><MapPin className="h-3.5 w-3.5" /> الرياض</span>
              </div>

              <div className={`mt-2 rounded-2xl bg-gradient-to-r ${currentActivity.accent} px-3 py-2 text-center text-sm font-black text-white`}>
                {currentActivity.primaryAction}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
                {currentActivity.modules.map((module) => (
                  <span key={module} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{module}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-3 pb-6 sm:px-6 sm:pb-7">
        <div className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-4 sm:rounded-[28px] sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-500">كيف يعمل؟</p>
              <h2 className="mt-1 text-[1.3rem] font-black leading-tight text-slate-950 sm:text-2xl">بسيط، سريع، واحترافي</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">أنشئ صفحتك، أضف ما يحتاجه نشاطك، وابدأ في استقبال الطلبات والرسائل.</p>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {[
              { title: "أنشئ حسابك", text: "ابدأ خلال دقائق قليلة." },
              { title: "أضف معلومات نشاطك", text: "اعرض الخدمات والمنتجات والاتصال." },
              { title: "شارك صفحتك", text: "أرسل الرابط لعملائك مباشرة." },
            ].map((step, index) => (
              <div key={step.title} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-black text-slate-700 shadow-sm">0{index + 1}</div>
                <div>
                  <div className="text-sm font-black text-slate-900">{step.title}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="activity" className="mx-auto max-w-6xl px-3 pb-6 sm:px-6 sm:pb-7">
        <div className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-4 sm:rounded-[28px] sm:px-7 sm:py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-500">تجربة مباشرة</p>
              <h2 className="mt-1 text-[1.3rem] font-black leading-tight text-slate-950 sm:text-2xl">صفحتك تعمل بالطريقة التي يحتاجها نشاطك</h2>
            </div>
            <p className="text-sm leading-7 text-slate-600">اختر نوع النشاط وسيتغير العرض الرئيسي للصفحة.</p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
            <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:gap-2">
              {activityOptions.map((activity) => {
                const Icon = activity.icon;
                const isActive = activity.id === activeActivity;
                return (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => setActiveActivity(activity.id)}
                    className={`flex min-h-[92px] flex-col items-start justify-center gap-2 rounded-2xl border px-3 py-3 text-right transition min-w-0 lg:min-h-[80px] lg:flex-row lg:items-center lg:justify-center lg:gap-2 lg:py-2.5 ${isActive ? "border-emerald-300 bg-emerald-50/80 shadow-sm" : "border-slate-200 bg-white"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-right">
                      <span className="block text-sm font-black text-slate-900">{activity.title}</span>
                      <span className="block text-[12px] text-slate-500">{activity.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-slate-950 p-2.5 text-white sm:rounded-[24px] sm:p-3">
              <div className="rounded-[16px] bg-white/10 p-2.5 sm:p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black">{currentActivity.title}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-slate-300">{currentActivity.description}</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300">مُخصّص</span>
                </div>
                <div className="mt-2.5 rounded-2xl bg-white p-2.5 text-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">م</div>
                    <div>
                      <p className="text-sm font-black">مركز الندى</p>
                      <p className="text-[12px] text-slate-500">صفحة موثقة</p>
                    </div>
                  </div>
                  <div className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-center text-sm font-black text-slate-900">{currentActivity.primaryAction}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
                    {currentActivity.modules.map((module) => (
                      <span key={module} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">{module}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 pb-6 sm:px-6 sm:pb-7">
        <div className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-4 sm:rounded-[28px] sm:px-7 sm:py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-500">التحكم في الصفحة</p>
              <h2 className="mt-1 text-[1.3rem] font-black leading-tight text-slate-950 sm:text-2xl">أنت تقرر ما يظهر... وأين يظهر</h2>
            </div>
            <p className="text-sm leading-7 text-slate-600">فعّل الأقسام التي تحتاجها، أخفِ الباقي، ورتّب صفحتك كما يناسب عملك.</p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-2.5 sm:rounded-[24px] sm:p-4">
              <div className="space-y-1.5">
                {controlModules.map((module, index) => (
                  <div key={module.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-2.5 py-2.5 sm:px-3 sm:py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-slate-400">0{index + 1}</span>
                      <span className="text-sm font-semibold text-slate-800">{module.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${module.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {module.active ? "مفعّل" : "معطّل"}
                      </span>
                      <span className="text-slate-400">⠿</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white p-2.5 text-slate-900 sm:rounded-[24px] sm:bg-slate-950 sm:p-3 sm:text-white">
              <div className="rounded-[16px] bg-slate-50 p-2.5 sm:rounded-[20px] sm:bg-white/10 sm:p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black">واجهة مختصرة</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-slate-500 sm:text-slate-300">تظهر الأقسام المختارة في ترتيب واضح</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-700 sm:text-emerald-300">مرن</span>
                </div>
                <div className="mt-2.5 space-y-1.5 rounded-2xl bg-white p-2 text-slate-900 sm:p-2.5">
                  <div className="flex items-center justify-between rounded-xl bg-slate-100 px-2.5 py-2 text-sm font-semibold">
                    <span>المنتجات</span>
                    <span className="text-emerald-600">✓</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-100 px-2.5 py-2 text-sm font-semibold">
                    <span>الخدمات</span>
                    <span className="text-emerald-600">✓</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-2.5 py-2 text-sm font-semibold text-slate-500">
                    <span>الحجز</span>
                    <span>—</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-3 pb-6 sm:px-6 sm:pb-7">
        <div className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-4 sm:rounded-[28px] sm:px-7 sm:py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-500">الباقات</p>
              <h2 className="mt-1 text-[1.3rem] font-black leading-tight text-slate-950 sm:text-2xl">أبسط طريقة للبدء</h2>
            </div>
            <p className="text-sm leading-7 text-slate-600">اختر الخطة المناسبة وأدِر صفحتك بثقة.</p>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:grid md:grid-cols-2">
            <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">مجانية</h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">ابدأ مجاناً</span>
              </div>
              <p className="mt-2.5 text-sm leading-7 text-slate-600">صفحة واضحة لعرض نشاطك وبدء التواصل مع العملاء.</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> صفحة احترافية</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> عرض الخدمات والمنتجات</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> استقبال الرسائل</li>
              </ul>
              <Link href="/register" className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#0f172a] px-4 text-sm font-black text-white">ابدأ مجاناً</Link>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-slate-950/95 p-4 text-white sm:rounded-[24px] sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">الباقة الاحترافية</h3>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-black text-slate-200">قريباً</span>
              </div>
              <p className="mt-2.5 text-sm leading-7 text-slate-300">ستتوفر مزايا إضافية لاحقاً لتوسيع تجربة صفحتك.</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> تخصيص أعمق</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> إدارة الحجوزات</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> تجربة أكثر مرونة</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="rounded-[28px] bg-[#0f172a] px-5 py-5 text-center text-white sm:px-7 sm:py-6">
          <h2 className="text-2xl font-black sm:text-3xl">أطلق صفحتك التجارية اليوم</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-300">صفحة احترافية، سريعة، ومصممة لتبرز نشاطك بكل وضوح.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-900">ابدأ مجاناً</Link>
            <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/30 px-5 text-sm font-black text-white">تسجيل الدخول</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:px-6 md:grid-cols-2">
          <div>
            <p className="text-lg font-black text-slate-900">HEE</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">منصة عربية تساعد الأعمال على إظهار نشاطها ووظائف التواصل والطلبات في صفحة واحدة.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-3">
            <a href="#how" className="hover:text-slate-950">كيف يعمل؟</a>
            <a href="#pricing" className="hover:text-slate-950">الباقات</a>
            <Link href="/login" className="hover:text-slate-950">تسجيل الدخول</Link>
            <Link href="/register" className="hover:text-slate-950">إنشاء حساب</Link>
            <Link href="/privacy" className="hover:text-slate-950">الخصوصية</Link>
            <Link href="/terms" className="hover:text-slate-950">الشروط</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
