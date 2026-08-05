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
  color = "#5D43EF",
}: {
  points: ChartPoint[];
  color?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { coords, width, height } = useMemo(() => {
    const chartWidth = 100;
    const chartHeight = 54;
    const maxValue = Math.max(...points.map((point) => point.value), 1);

    const computedCoords = points.map((point, index) => {
      const x = points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth;
      const y = chartHeight - (point.value / maxValue) * chartHeight;
      return { x, y };
    });

    return {
      coords: computedCoords,
      width: chartWidth,
      height: chartHeight,
    };
  }, [points]);

  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");

  const areaPath = `${path} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="space-y-3" dir="ltr">
      <div className="relative h-52 w-full overflow-hidden rounded-xl border border-[#edf0fb] bg-[#fbfcff] p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" aria-label="رسم زيارات الصفحة">
          <defs>
            <linearGradient id="hee-visits-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#hee-visits-fill)" />
          <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

          {coords.map((point, index) => {
            const active = hoveredIndex === index;
            return (
              <g key={points[index].dayKey}>
                <circle cx={point.x} cy={point.y} r={active ? 1.3 : 0.9} fill={color} />
                <rect
                  x={Math.max(point.x - 1.3, 0)}
                  y={0}
                  width={2.6}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onTouchStart={() => setHoveredIndex(index)}
                />
              </g>
            );
          })}
        </svg>

        {hoveredIndex !== null ? (
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-[#e3e7f7] bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm" dir="rtl">
            <p className="font-bold text-slate-800">{points[hoveredIndex].label}</p>
            <p className="mt-0.5">{formatNumber(points[hoveredIndex].value)} زيارة</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500" dir="rtl">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
