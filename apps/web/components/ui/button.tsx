"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

const variants = {
  primary:
    "border border-teal-800 bg-teal-800 text-white shadow-sm hover:bg-teal-900 dark:border-teal-300 dark:bg-teal-300 dark:text-slate-950 dark:hover:bg-teal-200",
  secondary:
    "border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-teal-600 hover:text-teal-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-300 dark:hover:text-teal-200",
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
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold tracking-tight transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
