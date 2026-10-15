"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type CardProps = HTMLMotionProps<"article"> & {
  children: ReactNode;
  hoverLift?: boolean;
};

export function Card({ className, children, hoverLift = false, ...props }: CardProps) {
  return (
    <motion.article
      whileHover={hoverLift ? { y: -4 } : undefined}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "rounded-[28px] border border-slate-300/80 bg-white p-6 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
      {...props}
    >
      {children}
    </motion.article>
  );
}
