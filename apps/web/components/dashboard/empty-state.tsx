import { UiText } from "../i18n/locale-provider";
import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
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
    <Card className="infro-empty-state" hoverLift={false}>
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200">
            <Inbox className="h-4 w-4" aria-hidden="true" /><UiText>{"لا توجد بيانات حالياً"}</UiText></div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100"><UiText>{title}</UiText></h3>
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300"><UiText>{description}</UiText></p>
        </div>

        <div className="flex flex-wrap gap-3">
          {secondaryAction ? (
            <Link href={secondaryAction.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
              <UiText>{secondaryAction.label}</UiText>
            </Link>
          ) : null}
          {primaryAction ? (
            <Link href={primaryAction.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-300 dark:text-slate-950">
              <UiText>{primaryAction.label}</UiText>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
