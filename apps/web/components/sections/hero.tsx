"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Container } from "../shared/container";
import { GradientBackground } from "../shared/gradient-background";
import { FloatingCard } from "../shared/floating-card";
import { PhoneFrame } from "./phone-frame";
import { StatCard } from "../shared/stat-card";

const stats = [
  { value: "24/7", label: "تواصل دائم" },
  { value: "3x", label: "سرعة التنفيذ" },
  { value: "100%", label: "مرونة للإدارة" },
];

export function HeroSection() {
  return (
    <section id="home" className="relative overflow-hidden py-10 md:py-16 lg:py-20">
      <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.3),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] dark:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.5),transparent_32%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.25),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(2,6,23,0))]" />

      <Container className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="text-right"
        >
          <Badge className="shadow-sm shadow-indigo-500/10">
            <Sparkles className="h-3.5 w-3.5" />
            منصة الأعمال الذكية في السعودية 🇸🇦
          </Badge>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.04, ease: "easeOut" }}
            className="mt-6 text-4xl font-black leading-[1.32] text-slate-950 dark:text-white md:text-5xl lg:text-[4.4rem]"
          >
            الهوية الرقمية
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
              لنشاطك التجاري
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="mt-6 max-w-2xl text-lg leading-9 text-slate-600 dark:text-slate-300 md:text-xl"
          >
            أنشئ صفحة أعمال احترافية، اعرض منتجاتك، استقبل الطلبات، وادِر حملاتك التسويقية من واجهة واحدة تتفوق على القوالب التقليدية وتمنح نشاطك حضوراً عالمي المستوى.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
            className="mt-8 flex flex-wrap justify-end gap-3"
          >
            <Link href="/register">
              <Button size="lg" icon={<Sparkles className="h-4 w-4" />}>
                إنشاء نشاط
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="secondary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                مشاهدة المثال
              </Button>
            </Link>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.28 }}
              >
                <StatCard value={stat.value} label={stat.label} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="relative flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute -left-4 top-2 h-28 w-28 rounded-full bg-indigo-400/30 blur-3xl dark:bg-indigo-500/25"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
            className="absolute -right-4 bottom-2 h-28 w-28 rounded-full bg-cyan-400/30 blur-3xl dark:bg-cyan-500/20"
          />

          <GradientBackground className="w-full max-w-[470px] p-5 md:p-6">
            <div className="relative">
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-3 top-8 z-20 hidden md:block"
              >
                <FloatingCard className="w-[160px] rounded-2xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300">تحقق سريع</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    68 شراء
                  </div>
                </FloatingCard>
              </motion.div>

              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-2 bottom-8 z-20 hidden md:block"
              >
                <FloatingCard className="w-[170px] rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-300">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    طلبات اليوم
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">12 موافقة</div>
                </FloatingCard>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <PhoneFrame>
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="mx-auto w-[88%] -mt-1 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200">اكتمل الدفع</span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        online
                      </span>
                    </div>
                  </motion.div>
                </PhoneFrame>
              </motion.div>
            </div>
          </GradientBackground>
        </div>
      </Container>
    </section>
  );
}
