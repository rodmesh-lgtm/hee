"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { Container } from "../shared/container";
import { Heading } from "../shared/heading";

const features = [
  {
    title: "واجهة احترافية",
    description: "صمم نشاطك بمنظر أنيق ومريح يساعد الزائر على التفاعل بدون تشتت.",
  },
  {
    title: "طلب مباشر",
    description: "التقاط الطلبات بسهولة مع تجربة واضحة من صفحة النشاط إلى الرسالة المستلمة.",
  },
  {
    title: "حملات ذكية",
    description: "أدر العروض والرسائل بشكل منظم ضمن واجهة موحدة وسريعة لقراءة البيانات.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-16 md:py-20">
      <Container>
        <Heading
          eyebrow="المزايا"
          title="كل ما تحتاجه لإدارة نشاطك"
          description="منصة iR مصممة لتكون مساحة موحدة لإدارة أعمالك بواجهة احترافية، تجربة واضحة، وعمليات متسلسلة من الطلب إلى التوصيل والقياس."
          align="start"
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
            >
              <Card className="h-full">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">{feature.title}</h3>
                <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
