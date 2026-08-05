"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type CardProps = HTMLMotionProps<"article"> & {
  children: ReactNode;
  hoverLift?: boolean;
};

export function Card({ className, children, hoverLift = true, ...props }: CardProps) {
  return (
    <motion.article
      whileHover={hoverLift ? { y: -4 } : undefined}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/80",
        className,
      )}
      {...props}
    >
      {children}
    </motion.article>
  );
}
