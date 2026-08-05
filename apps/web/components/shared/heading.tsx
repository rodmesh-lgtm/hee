import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type HeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "start" | "center";
  action?: ReactNode;
  className?: string;
};

export function Heading({
  eyebrow,
  title,
  description,
  align = "start",
  action,
  className,
}: HeadingProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        align === "start" && "text-right",
        className,
      )}
    >
      {eyebrow ? (
        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
          {eyebrow}
        </span>
      ) : null}

      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
