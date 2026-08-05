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
        "relative overflow-hidden rounded-[36px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.32),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.24),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(248,250,252,0.96))] shadow-[0_30px_120px_-55px_rgba(79,70,229,0.85)] backdrop-blur dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.5),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.3),_transparent_34%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.5)_45%,transparent_100%)] opacity-70 dark:opacity-20" />
      <div className="absolute left-6 top-6 h-24 w-24 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-500/25" />
      <div className="absolute bottom-5 right-8 h-20 w-20 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-400/20" />
      <div className="relative">{children}</div>
    </div>
  );
}
