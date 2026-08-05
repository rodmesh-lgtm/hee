"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PublicWorkingHour } from "./types";

type PublicHoursSectionProps = {
  hours: PublicWorkingHour[];
  statusLabel: string | null;
  statusDetail?: string | null;
  fallbackText: string | null;
  accentColor: string;
  title?: string;
  darkMode?: boolean;
  compact?: boolean;
};

const weekOrder = [5, 6, 0, 1, 2, 3, 4];
const dayNames: Record<number, string> = {
  0: "الاثنين",
  1: "الثلاثاء",
  2: "الأربعاء",
  3: "الخميس",
  4: "الجمعة",
  5: "السبت",
  6: "الأحد",
};

function formatShift(item: PublicWorkingHour) {
  if (item.isClosed) {
    return "مغلق";
  }

  const first = `${item.opensAt ?? "--:--"} - ${item.closesAt ?? "--:--"}`;
  const second = item.secondOpensAt && item.secondClosesAt ? ` • ${item.secondOpensAt} - ${item.secondClosesAt}` : "";
  return `${first}${second}`;
}

export function PublicHoursSection({ hours, statusLabel, statusDetail, fallbackText, accentColor, title = "ساعات العمل", darkMode = false, compact = false }: PublicHoursSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const rows = weekOrder.map((dayOfWeek) => hours.find((item) => item.dayOfWeek === dayOfWeek) ?? null);
  const todayIndex = (new Date().getDay() + 6) % 7;

  if (hours.length === 0 && !fallbackText) {
    return null;
  }

  return (
    <section className={`${compact ? "p-3" : "p-4"} ${darkMode ? "rounded-[24px] border border-white/10 bg-slate-950/70 backdrop-blur" : "rounded-[18px] border border-[#e8ebf7] bg-white"}`}>
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
        {statusLabel ? (
          <span
            className="rounded-full border px-3 py-1 text-xs font-bold"
            style={{ borderColor: `${accentColor}55`, color: accentColor, background: `${accentColor}14` }}
          >
            {statusLabel}
          </span>
        ) : null}
      </div>

      {statusDetail ? <p className={`mt-2 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{statusDetail}</p> : null}

      {hours.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className={`mt-3 flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-right text-sm font-semibold ${
              darkMode ? "border border-white/10 bg-white/5 text-white" : "border border-[#e8ebf7] bg-[#fafbff] text-[#1f2552]"
            }`}
          >
            <span>عرض ساعات العمل</span>
            <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
          </button>

          {expanded ? (
            <div className="mt-3 space-y-2">
              {rows.map((hour, index) => (
                <div
                  key={hour?.id ?? `${index}-day`}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    weekOrder[index] === todayIndex
                      ? darkMode
                        ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : darkMode
                        ? "bg-white/5 text-slate-200"
                        : "border border-[#eef1fb] bg-white text-slate-700"
                  }`}
                >
                  <span>{dayNames[weekOrder[index]]}</span>
                  <span>{hour ? formatShift(hour) : "مغلق"}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className={`mt-3 text-sm leading-7 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{fallbackText}</p>
      )}
    </section>
  );
}
