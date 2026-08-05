import { ArrowRight, Check, Sparkles } from "lucide-react";
import { BusinessTypesSection } from "../components/sections/business-types";
import { FeatureGrid } from "../components/sections/feature-grid";
import { PhoneFrame } from "../components/sections/phone-frame";
import { PricingSection } from "../components/sections/pricing";
import { BusinessCard } from "../components/shared/business-card";
import { Container } from "../components/shared/container";
import { FloatingCard } from "../components/shared/floating-card";
import { GradientBackground } from "../components/shared/gradient-background";
import { StatCard } from "../components/shared/stat-card";
import { Footer } from "../components/layout/footer";
import { Navbar } from "../components/layout/navbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

const stats = [
  { value: "24/7", label: "تواصل دائم" },
  { value: "3x", label: "سرعة التنفيذ" },
  { value: "100%", label: "مرونة للإدارة" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Navbar />

      <section id="home" className="py-10 md:py-16">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-right">
            <Badge>
              <Sparkles className="h-3.5 w-3.5" />
              منصة الأعمال الذكية في السعودية 🇸🇦
            </Badge>

            <h1 className="mt-6 text-4xl font-black leading-[1.5] text-slate-950 dark:text-white md:text-5xl lg:text-6xl">
              الهوية الرقمية
              <br />
              <span className="text-indigo-600 dark:text-indigo-300">لنشاطك التجاري</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-600 dark:text-slate-300 md:text-xl">
              أنشئ صفحة أعمال احترافية، اعرض منتجاتك، استقبل الطلبات، وادِر حملاتك التسويقية من واجهة واحدة سهلة وسريعة.
            </p>

            <div className="mt-8 flex flex-wrap justify-end gap-4">
              <Button size="lg" icon={<Sparkles className="h-4 w-4" />}>إنشاء نشاط</Button>
              <Button variant="secondary" size="lg">مشاهدة المثال</Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <StatCard key={stat.label} value={stat.value} label={stat.label} />
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <GradientBackground className="w-full max-w-[430px] p-5">
              <PhoneFrame>
                <FloatingCard className="mx-auto w-[88%] -mt-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300">اكتمل الدفع</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">online</span>
                  </div>
                </FloatingCard>
              </PhoneFrame>
            </GradientBackground>
          </div>
        </Container>
      </section>

      <FeatureGrid />

      <BusinessTypesSection />

      <section className="py-16 md:py-20">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge>Business Card</Badge>
              <h2 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">عرض مهني لكل نشاط</h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                بطاقات أعمال قابلة لإعادة الاستخدام، مع بيانات أساسية، موقع، عروض، ومنطقة تواصل واضحة.
              </p>
            </div>

            <BusinessCard
              logo="H"
              name="مطعم النخلة"
              specialty="مطعم • متجر • توصيل"
              location="الرياض، حي النخيل"
              products={["شاورما", "مشاوي", "حلويات", "مشروبات"]}
              offers={["خصم 15%", "توصيل مجاني"]}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                شحن سريع
              </div>
            </BusinessCard>
          </div>
        </Container>
      </section>

      <PricingSection />

      <section id="cta" className="pb-20 pt-2">
        <Container>
          <GradientBackground className="p-8 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm dark:bg-slate-900/80 dark:text-indigo-200">
              <Sparkles className="h-4 w-4" />
              ابدأ اليوم
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">حول فكرتك إلى منصة تجارية جاهزة</h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> إعداد سريع</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> واجهة عربية</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> جاهز للتوسع</span>
            </div>
            <Button className="mt-6" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              اطلب جلسة تجريبية
            </Button>
          </GradientBackground>
        </Container>
      </section>

      <Footer />
    </main>
  );
}