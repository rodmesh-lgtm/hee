"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Coffee,
  HeartPulse,
  Landmark,
  Scissors,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type BusinessType = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const businessTypes: BusinessType[] = [
  {
    icon: UtensilsCrossed,
    title: "مطعم",
    description: "عرض قائمة الطعام، الطلبات السريعة، والعروض داخل واجهة احترافية.",
  },
  {
    icon: Coffee,
    title: "مقهى",
    description: "إدارة الطلبات اليومية، منتجات القهوة، والعروض الترويجية بشكل واضح.",
  },
  {
    icon: Wrench,
    title: "ورشة",
    description: "استعراض الخدمات والمهام والجدول الزمني مع تواصل مباشر مع العملاء.",
  },
  {
    icon: HeartPulse,
    title: "عيادة",
    description: "تجربة_booking احترافية لعرض الخدمات والحجوزات عبر عناصر واضحة.",
  },
  {
    icon: Building2,
    title: "شركة",
    description: "عرض الخدمات، قطع العمل، وتواصل مع العملاء في صفحة موحدة.",
  },
  {
    icon: Store,
    title: "متجر",
    description: "عرض المنتجات، قوالب التسعير، والعروض من نفس الصفحة البصرية.",
  },
  {
    icon: Scissors,
    title: "صالون",
    description: "خدمات التجميل، مواعيد الحجز، والعروض المخصصة بكل سهولة.",
  },
  {
    icon: Landmark,
    title: "عقارات",
    description: "عرض العقارات، المشاريع، والأسعار بطريقة منظمة ومميزة بصرياً.",
  },
];

export function BusinessTypesSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10 text-center">
        <p className="text-sm font-bold text-indigo-700">أنواع الأعمال</p>
        <h2 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">
          لكل نوع نشاط واجهة مناسبة
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {businessTypes.map((businessType, index) => {
          const Icon = businessType.icon;

          return (
            <motion.article
              key={businessType.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900">{businessType.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {businessType.description}
              </p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
