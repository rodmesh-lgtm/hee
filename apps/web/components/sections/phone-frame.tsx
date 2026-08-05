"use client";

import { motion } from "framer-motion";
import { MapPin, MessageCircle, QrCode, ShieldCheck, ShoppingCart, Store, WandSparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { VerifiedBadge } from "../ui/verified-badge";

type PhoneFrameProps = {
  children?: ReactNode;
  className?: string;
};

export function PhoneFrame({ children, className }: PhoneFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "relative mx-auto w-full max-w-[360px] rounded-[40px] border border-slate-200 bg-slate-950 p-3 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.85)] dark:border-slate-700",
        className,
      )}
    >
      <div className="rounded-[32px] bg-gradient-to-b from-slate-950 to-slate-900 p-4 text-white">
        <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-slate-700" />
        <div className="rounded-[24px] bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-black">
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
            <div className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
              WhatsApp
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-slate-800/80 p-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-300"><MessageCircle className="h-4 w-4" /> رسائل العملاء</div>
              <div className="mt-2 text-sm font-semibold">13 رسالة جديدة اليوم</div>
            </div>
            <div className="rounded-2xl bg-slate-800/80 p-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-300"><ShoppingCart className="h-4 w-4" /> آخر الطلبات</div>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>شاورما لحم</span><span className="text-indigo-300">SAR 48</span></div>
                <div className="flex items-center justify-between"><span>كباب مشوي</span><span className="text-indigo-300">SAR 64</span></div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-800/80 p-3 text-xs text-slate-300">
              <div className="flex items-center gap-1"><MapPin className="h-4 w-4" /> الموقع</div>
              <p className="mt-2 text-sm font-semibold text-white">الرياض • حي النخيل</p>
            </div>
            <div className="rounded-2xl bg-slate-800/80 p-3 text-xs text-slate-300">
              <div className="flex items-center gap-1"><QrCode className="h-4 w-4" /> QR</div>
              <div className="mt-2 h-12 rounded-xl bg-white/10" />
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-800/80 p-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-300"><WandSparkles className="h-4 w-4" /> العروض</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">خصم 15%</span>
              <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-indigo-300">توصيل مجاني</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-300"><ShieldCheck className="h-4 w-4" /> موثّق</div>
            <div className="flex items-center gap-2 text-xs text-slate-300"><Store className="h-4 w-4" /> متجر</div>
          </div>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </motion.div>
  );
}
