import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";

type StatCardProps = {
  value: string;
  label: string;
  icon?: ReactNode;
  className?: string;
};

export function StatCard({ value, label, icon, className }: StatCardProps) {
  return (
    <Card className={cn("text-center", className)} hoverLift={false}>
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
        {icon}
      </div>
      <div className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">{label}</div>
    </Card>
  );
}
