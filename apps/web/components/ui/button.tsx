"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

const variants = {
  primary:
    "bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 text-white shadow-[0_18px_60px_-22px_rgba(79,70,229,0.9)] hover:brightness-110",
  secondary:
    "border border-slate-300/80 bg-white/75 text-slate-800 shadow-sm backdrop-blur hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-indigo-400 dark:hover:text-indigo-200",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/70",
};

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-bold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
}
