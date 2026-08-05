import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type GradientBackgroundProps = {
  children: ReactNode;
  className?: string;
};

export function GradientBackground({ children, className }: GradientBackgroundProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[32px] border border-indigo-100 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.24),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.98))] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.42),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.45)_50%,transparent_100%)] opacity-50 dark:opacity-20" />
      <div className="relative">{children}</div>
    </div>
  );
}
