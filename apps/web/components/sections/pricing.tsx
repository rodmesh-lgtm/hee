import { COMMERCIAL_PLANS } from "../../app/lib/commercial-plans";
import { Container } from "../shared/container";
import { Heading } from "../shared/heading";
import { PricingCard } from "../shared/pricing-card";

const plans=COMMERCIAL_PLANS.map(p=>({title:p.name,price:p.monthlyPrice?`${p.monthlyPrice} ريال / شهر`:"مجانية",description:p.description,featured:p.featured,features:[...p.features]}));

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

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
