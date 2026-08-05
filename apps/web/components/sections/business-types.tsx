"use client";

import { Building2, Coffee, HeartPulse, Home, Scissors, Store, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { Container } from "../shared/container";
import { Heading } from "../shared/heading";

const businessTypes = [
  { icon: Store, title: "متاجر", description: "عرض المنتجات، منتجات مميزة، والعروض بشكل أنيق ومريح." },
  { icon: Coffee, title: "كافيهات", description: "واجهة موجهة للطلب السريع مع احتساب العروض والمنتجات." },
  { icon: Wrench, title: "ورش", description: "عرض الخدمات والمهارات مع نظام توضيحي شفاف للطلبات." },
  { icon: HeartPulse, title: "عيادات", description: "عرض الخدمات، الأوقات، والتواصل مع العميل بطريقة احترافية." },
  { icon: Building2, title: "شركات", description: "خدمة أكثر احترافية مع قسم للمحتوى والاتصال والمنتجات." },
  { icon: Scissors, title: "صالونات", description: "تعرف على الخدمات المتاحة، العروض، والمواعيد بسهولة." },
  { icon: Home, title: "عقارات", description: "عرض الوحدات واستعراض أفضل الفرص السكنية والتجارية." },
];

export function BusinessTypesSection() {
  return (
    <section id="business-types" className="py-16 md:py-20">
      <Container>
        <Heading
          eyebrow="أنواع الأعمال"
          title="كل نشاط له واجهة مناسبة"
          description="اختر الفئة المناسبة لنشاطك وبدّل محتوى البطاقات بسرعة مع نظام تصميم موحد وآمن للإعادة الاستخدام."
          align="start"
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {businessTypes.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
              >
                <Card className="group h-full transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_20px_60px_-35px_rgba(79,70,229,0.7)]">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:scale-110 dark:bg-indigo-500/10 dark:text-indigo-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
