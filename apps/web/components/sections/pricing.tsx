import { Container } from "../shared/container";
import { Heading } from "../shared/heading";
import { PricingCard } from "../shared/pricing-card";

const plans = [
  {
    title: "الباقة الأساسية",
    price: "مجانية",
    description: "للمشاريع الصغيرة والاختبارات المبكرة.",
    features: ["صفحة احترافية", "منتجات محددة", "دعم أساسي"],
  },
  {
    title: "الباقة الاحترافية",
    price: "299 ريال",
    description: "الأنسب لرواد الأعمال الذين يحتاجون سرعة وسهولة.",
    featured: true,
    features: ["كل ما في الأساسية", "أدوات إدارة متقدمة", "إدارة العروض", "تصميم مخصص"],
  },
  {
    title: "الباقة التوسعية",
    price: "599 ريال",
    description: "للمتاجر التي تحتاج توسعاً وأكثر من واجهة واحدة.",
    features: ["كل ما في الاحترافية", "إدارة فريق", "تقارير أساسية", "تحسينات مخصصة"],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-20">
      <Container>
        <Heading
          eyebrow="الأسعار"
          title="خطط مرنة لبداية احترافية"
          description="اختر الباقة المناسبة لنشاطك، ثم توسع مع الزمن دون إعادة بناء النظام أو تبديل الواجهة."
          align="start"
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard
              key={plan.title}
              title={plan.title}
              price={plan.price}
              description={plan.description}
              featured={plan.featured}
              features={plan.features}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
