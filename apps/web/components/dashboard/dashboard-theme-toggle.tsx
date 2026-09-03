"use client";
import { useEffect,useState } from "react";
import { Monitor,Moon,Sun } from "lucide-react";
const KEY="infro-dashboard-theme";
type Theme="light"|"dark"|"system";
function workspace(){return document.querySelector<HTMLElement>("[data-dashboard-path]")}
function systemTheme():"light"|"dark"{return typeof window!=="undefined"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light"}
function savedTheme():Theme{if(typeof window==="undefined")return"system";try{const value=localStorage.getItem(KEY);return value==="dark"||value==="light"||value==="system"?value:"system"}catch{return"system"}}
function resolved(theme:Theme){return theme==="system"?systemTheme():theme}
function apply(theme:Theme,persist=true){const root=workspace();if(root)root.dataset.dashboardTheme=resolved(theme);if(persist)try{localStorage.setItem(KEY,theme)}catch{}}
export function DashboardThemeToggle({showLabel=false}:{showLabel?:boolean}){
  const[theme,setTheme]=useState<Theme>(savedTheme);
  useEffect(()=>{
    apply(theme,false);
    if(theme!=="system"||typeof window==="undefined")return;
    const media=window.matchMedia("(prefers-color-scheme: dark)");
    const sync=()=>apply("system",false);
    media.addEventListener?.("change",sync);
    return()=>media.removeEventListener?.("change",sync);
  },[theme]);
  const cycle=()=>{const next:Theme=theme==="system"?"light":theme==="light"?"dark":"system";setTheme(next);apply(next)};
  const Icon=theme==="dark"?Sun:theme==="light"?Moon:Monitor;
  const label=theme==="dark"?"المظهر الداكن — اضغط لاختيار تلقائي":theme==="light"?"المظهر الفاتح — اضغط للداكن":"المظهر تلقائي حسب الجهاز — اضغط للفاتح";
  return <button type="button" onClick={cycle} aria-label={label} title={label} className="infro-theme-toggle group inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 shadow-[0_12px_30px_-20px_rgba(7,24,27,.45)] transition hover:-translate-y-0.5 hover:border-[#9fe8df] hover:text-[#008f87]">
    <span className="relative grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-slate-100 transition group-hover:bg-[#e9fbf8]"><Icon className="h-3.5 w-3.5"/></span>
    <span className={showLabel?"inline":"hidden xl:inline"}>{theme==="dark"?"داكن":theme==="light"?"فاتح":"تلقائي"}</span>
  </button>;
}
