"use client";

import { useMemo, useState } from "react";

type ChartPoint = {
  label: string;
  dayKey: string;
  value: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function AnalyticsVisitsChart({
  points,
  color = "#00BFAE",
}: {
  points: ChartPoint[];
  color?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { coords, width, height, maxValue } = useMemo(() => {
    const chartWidth = 100;
    const chartHeight = 54;
    const peak = Math.max(...points.map((point) => point.value), 1);
    const computedCoords = points.map((point, index) => {
      const x = points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth;
      const y = chartHeight - (point.value / peak) * chartHeight;
      return { x, y };
    });
    return { coords: computedCoords, width: chartWidth, height: chartHeight, maxValue: peak };
  }, [points]);

  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const areaPath = path ? `${path} L ${width},${height} L 0,${height} Z` : "";
  const selected = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div className="space-y-3" dir="ltr">
      <div className="relative h-48 w-full overflow-hidden rounded-[20px] border border-[#dcebe8] bg-[linear-gradient(180deg,#fbfefd_0%,#f6fbfa_100%)] p-3 sm:h-56 sm:p-4">
        <div className="pointer-events-none absolute inset-x-3 top-1/4 border-t border-dashed border-slate-200/80 sm:inset-x-4" />
        <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-dashed border-slate-200/70 sm:inset-x-4" />
        <div className="pointer-events-none absolute inset-x-3 top-3/4 border-t border-dashed border-slate-200/60 sm:inset-x-4" />
        <svg viewBox={`0 0 ${width} ${height}`} className="relative h-full w-full" preserveAspectRatio="none" aria-label="رسم زيارات الصفحة">
          <defs>
            <linearGradient id="infro-visits-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.015" />
            </linearGradient>
          </defs>
          {areaPath ? <path d={areaPath} fill="url(#infro-visits-fill)" /> : null}
          {path ? <path d={path} fill="none" stroke={color} strokeWidth="1.35" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {coords.map((point, index) => {
            const active = activeIndex === index;
            return (
              <g key={points[index].dayKey}>
                <circle cx={point.x} cy={point.y} r={active ? 1.4 : 0.72} fill={active ? "#07181b" : color} />
                <rect
                  x={Math.max(point.x - 1.8, 0)}
                  y={0}
                  width={3.6}
                  height={height}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${points[index].label}: ${formatNumber(points[index].value)} زيارة`}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onTouchStart={() => setActiveIndex(index)}
                />
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-[#cde8e4] bg-white/90 px-2.5 py-1 text-[9px] font-black text-[#087b73] shadow-sm backdrop-blur sm:left-4 sm:top-4">PEAK · {formatNumber(maxValue)}</div>
        {selected ? (
          <div className="pointer-events-none absolute right-3 top-3 min-w-[112px] rounded-2xl border border-[#cde8e4] bg-[#07181b] px-3 py-2 text-white shadow-[0_12px_30px_-18px_rgba(7,24,27,.6)] sm:right-4 sm:top-4" dir="rtl">
            <p className="text-[9px] font-bold text-slate-400">{selected.label}</p>
            <p className="mt-1 text-sm font-black"><span className="text-[#6eead8]">{formatNumber(selected.value)}</span> زيارة</p>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 px-1 text-[10px] font-semibold text-slate-400 sm:text-[11px]" dir="rtl">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
