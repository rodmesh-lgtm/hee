import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

type VerifiedBadgeProps = {
  className?: string;
};

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
        className,
      )}
    >
      <Check className="h-3 w-3" />
      موثّق
    </span>
  );
}
