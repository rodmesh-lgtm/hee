import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumb } from "./breadcrumb";

type DashboardPageHeaderProps = {
  breadcrumbs: Array<{ label: string; href?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  action?: ReactNode;
};

export function DashboardPageHeader({ breadcrumbs, title, description, actionLabel, actionHref, action }: DashboardPageHeaderProps) {
  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-[0_18px_60px_-22px_rgba(79,70,229,0.9)] transition hover:brightness-110"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
