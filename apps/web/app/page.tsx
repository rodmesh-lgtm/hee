import { ArrowRight, Check, Sparkles } from "lucide-react";
import { BusinessTypesSection } from "../components/sections/business-types";
import { FeatureGrid } from "../components/sections/feature-grid";
import { HeroSection } from "../components/sections/hero";
import { PricingSection } from "../components/sections/pricing";
import { BusinessCard } from "../components/shared/business-card";
import { Container } from "../components/shared/container";
import { GradientBackground } from "../components/shared/gradient-background";
import { Footer } from "../components/layout/footer";
import { Navbar } from "../components/layout/navbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Navbar />

      <HeroSection />

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