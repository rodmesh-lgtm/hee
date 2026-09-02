"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "infro-dashboard-theme";
type Theme = "light" | "dark";

function workspace() {
  return document.querySelector<HTMLElement>("[data-dashboard-path]");
}

function apply(theme: Theme, persist = true) {
  const root = workspace();
  if (root) root.dataset.dashboardTheme = theme;
  if (persist) {
    try { localStorage.setItem(KEY, theme); } catch {}
  }
}

export function DashboardThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let saved: Theme = "light";
    try { saved = localStorage.getItem(KEY) === "dark" ? "dark" : "light"; } catch {}
    setTheme(saved);
    apply(saved, false);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
  };

  const toLight = theme === "dark";
  return <button type="button" onClick={toggle} aria-pressed={theme === "dark"} aria-label={toLight ? "استخدام المظهر الفاتح" : "استخدام المظهر الداكن"} title={toLight ? "المظهر الفاتح" : "المظهر الداكن"} className="infro-theme-toggle inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 transition hover:border-[#9fe8df] hover:text-[#008f87]"><span className="relative grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-slate-100">{toLight ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}</span><span className="hidden xl:inline">{toLight ? "فاتح" : "داكن"}</span></button>;
}
