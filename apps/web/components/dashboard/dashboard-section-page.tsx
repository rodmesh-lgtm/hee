import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/card";
import { DashboardEmptyState } from "./empty-state";
import { DashboardPageHeader } from "./page-header";

export type DashboardSectionCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type DashboardSectionPageProps = {
  breadcrumbs: Array<{ label: string; href?: string }>;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  cards?: DashboardSectionCard[];
};

export function DashboardSectionPage({
  breadcrumbs,
  title,
  description,
  actionLabel,
  actionHref,
  emptyStateTitle,
  emptyStateDescription,
  primaryActionLabel,
  primaryActionHref,
  secondaryActionLabel,
  secondaryActionHref,
  cards = [],
}: DashboardSectionPageProps) {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={breadcrumbs}
        title={title}
        description={description}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />

      <DashboardEmptyState
        title={emptyStateTitle}
        description={emptyStateDescription}
        primaryAction={{ label: primaryActionLabel, href: primaryActionHref }}
        secondaryAction={secondaryActionLabel && secondaryActionHref ? { label: secondaryActionLabel, href: secondaryActionHref } : undefined}
      />

      {cards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Card key={card.title} className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-white">{card.title}</h3>
                <p className="text-sm leading-7 text-slate-400">{card.description}</p>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
