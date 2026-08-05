import { Card } from "../ui/card";
import type { LucideIcon } from "lucide-react";

export type DashboardStat = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function DashboardStatGrid({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.label} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-400">{stat.label}</div>
                <div className="mt-2 text-3xl font-black text-white">{stat.value}</div>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-200">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-400">{stat.description}</p>
          </Card>
        );
      })}
    </div>
  );
}
