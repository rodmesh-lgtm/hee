import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "../ui/card";

type Action = {
  label: string;
  href: string;
};

export function DashboardEmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description: string;
  primaryAction?: Action;
  secondaryAction?: Action;
}) {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            لا توجد بيانات حالياً
          </div>
          <h3 className="text-2xl font-black text-white">{title}</h3>
          <p className="text-sm leading-7 text-slate-400">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {secondaryAction ? (
            <Link href={secondaryAction.href} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:border-indigo-400/40 hover:bg-indigo-500/10">
              {secondaryAction.label}
            </Link>
          ) : null}
          {primaryAction ? (
            <Link href={primaryAction.href} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white">
              {primaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
