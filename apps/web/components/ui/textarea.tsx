import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-900 placeholder:text-slate-500 outline-none transition-colors motion-reduce:transition-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 aria-invalid:border-rose-600 aria-invalid:focus:ring-rose-600/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-teal-300 dark:focus:ring-teal-300/20 dark:disabled:bg-slate-800 dark:aria-invalid:border-rose-400 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
