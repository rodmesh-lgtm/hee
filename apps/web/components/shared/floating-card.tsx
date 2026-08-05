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
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-[0_18px_80px_-35px_rgba(79,70,229,0.7)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/70",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
