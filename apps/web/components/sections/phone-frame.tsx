"use client";

import { motion } from "framer-motion";
import {
  Clock3,
  GalleryHorizontalEnd,
  Globe2,
  Link2,
  MapPin,
  MessageCircle,
  MessagesSquare,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Store,
  WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { VerifiedBadge } from "../ui/verified-badge";

type PhoneFrameProps = {
  children?: ReactNode;
  className?: string;
};

type PhonePointProps = {
  label: string;
  icon: ReactNode;
  children: ReactNode;
};

const products = ["شاورما", "مشاوي", "حلويات", "مشروبات"];
const offers = ["خصم 15%", "توصيل مجاني", "جلسة عائلية"];
const gallery = ["سفرة", "أجواء", "منتجات", "مطبخ"];
const socialLinks = ["Instagram", "TikTok", "Website"];

function PhonePoint({ label, icon, children }: PhonePointProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
      <div className="flex items-center gap-1 text-[11px] text-slate-300">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

export function PhoneFrame({ children, className }: PhoneFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      aria-label="معلومات نشاط تجاري داخل هاتف محاكاة"
      role="img"
      className={cn(
        "relative mx-auto w-full max-w-[360px] rounded-[42px] border border-slate-300/80 bg-slate-950 p-2.5 shadow-[0_30px_120px_-45px_rgba(15,23,42,0.95)] ring-1 ring-white/10 dark:border-slate-700",
        className,
      )}
    >
      <div className="absolute right-3 top-3 h-10 w-1 rounded-full bg-slate-800" />
      <div className="absolute left-3 top-14 h-16 w-1 rounded-full bg-slate-800" />
      <div className="absolute left-3 top-28 h-12 w-1 rounded-full bg-slate-800" />
      <div className="absolute left-1/2 top-3 z-20 h-7 w-32 -translate-x-1/2 rounded-full bg-slate-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)]" />
      <div className="absolute left-1/2 top-4 z-20 h-3 w-20 -translate-x-1/2 rounded-full bg-slate-900" />

      <div className="rounded-[34px] bg-[linear-gradient(180deg,#0f172a_0%,#020617_52%,#020617_100%)] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-slate-700" />
        <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(3,7,18,0.98))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-black shadow-lg shadow-indigo-500/30">
                H
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black">مطعم النخلة</p>
                  <VerifiedBadge className="text-[9px]" />
                </div>
                <p className="text-xs text-slate-400">مطعم • متجر • توصيل</p>
              </div>
            </div>
            <a
              aria-label="تواصل عبر واتساب"
              href="https://wa.me/966550000000?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300"
            >
              WhatsApp
            </a>
          </div>

          <PhonePoint label="المنتجات" icon={<ShoppingBag className="h-4 w-4 text-indigo-300" />}>
            <div className="mt-3 flex flex-wrap gap-2">
              {products.map((product) => (
                <span key={product} className="rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-semibold text-slate-100">
                  {product}
                </span>
              ))}
            </div>
          </PhonePoint>

          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-200">
              <WandSparkles className="h-4 w-4" />
              <span>العروض</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {offers.map((offer) => (
                <span key={offer} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                  {offer}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <PhonePoint label="المعرض" icon={<GalleryHorizontalEnd className="h-4 w-4" />}>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {gallery.map((item) => (
                  <div key={item} className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 p-2 text-center text-[10px] text-slate-100">
                    {item}
                  </div>
                ))}
              </div>
            </PhonePoint>

            <PhonePoint label="الموقع" icon={<MapPin className="h-4 w-4" />}>
              <p className="mt-2 text-sm font-semibold text-white">الرياض • حي النخيل</p>
            </PhonePoint>
          </div>

          <div className="mt-3 grid grid-cols-[0.9fr_1.1fr] gap-3">
            <PhonePoint label="QR" icon={<QrCode className="h-4 w-4" />}>
              <div className="mt-2 h-20 rounded-xl bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(99,102,241,0.45))]" aria-hidden="true" />
            </PhonePoint>

            <PhonePoint label="أوقات العمل" icon={<Clock3 className="h-4 w-4" />}>
              <p className="mt-2 text-sm font-semibold text-white">من 12:00 إلى 01:00</p>
              <p className="mt-1 text-[11px] text-slate-300">السبت - الخميس</p>
            </PhonePoint>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] text-slate-300">
                <Link2 className="h-4 w-4" />
                <span>الروابط</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300" aria-hidden="true">
                <Globe2 className="h-4 w-4" />
                <MessagesSquare className="h-4 w-4" />
                <MessageCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <span key={link} className="rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-semibold text-slate-100">
                  {link}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>موثّق</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Store className="h-4 w-4" />
              <span>متجر</span>
            </div>
          </div>

          <a
            aria-label="ابدأ الطلب عبر واتساب"
            href="https://wa.me/966550000000?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%B7%D9%84%D8%A8%D8%A7%D9%8B%20%D8%AC%D8%AF%D9%8A%D8%AF%D8%A7%D9%8B"
            target="_blank"
            rel="noreferrer"
            className="mt-3 block rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-3 text-center shadow-lg shadow-indigo-500/25"
          >
            <div className="text-[11px] font-bold text-indigo-50">ابدأ الطلب الآن</div>
            <div className="mt-1 text-sm font-black text-white">الطلب عبر WhatsApp</div>
          </a>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </motion.div>
  );
}
