"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type FloatingCardProps = {
  children: ReactNode;
  className?: string;
};

export function FloatingCard({ children, className }: FloatingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "rounded-[28px] border border-white/60 bg-white/80 p-4 shadow-[0_20px_80px_-40px_rgba(79,70,229,0.6)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/80",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
