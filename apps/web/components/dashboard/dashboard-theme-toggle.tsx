"use client";
import { useEffect,useLayoutEffect,useState } from "react";
import { Monitor,Moon,Sun } from "lucide-react";
const KEY="infro-dashboard-theme";
type Theme="light"|"dark"|"system";
function workspaces(){return Array.from(document.querySelectorAll<HTMLElement>("[data-dashboard-path],[data-admin-shell]"))}
function systemTheme():"light"|"dark"{return typeof window!=="undefined"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light"}
function savedTheme():Theme{if(typeof window==="undefined")return"system";try{const value=localStorage.getItem("infro-dashboard-theme");return value==="dark"||value==="light"||value==="system"?value:"system"}catch{return"system"}}
function resolved(theme:Theme){return theme==="system"?systemTheme():theme}
function apply(theme:Theme,persist=true){
  const value=resolved(theme);
  for(const root of workspaces()){root.dataset.dashboardTheme=value;root.setAttribute("data-dashboard-theme",value);root.style.colorScheme=value}
  document.documentElement.dataset.infroWorkspaceTheme=value;
  document.documentElement.style.colorScheme=value;
  if(persist){
    try{localStorage.setItem("infro-dashboard-theme",theme)}catch{}
    window.dispatchEvent(new Event("infro-theme-change"));
  }
}
export function DashboardThemeToggle({showLabel=false}:{showLabel?:boolean}){
  const[theme,setTheme]=useState<Theme>(savedTheme);
  useLayoutEffect(()=>{apply(theme,false)},[theme]);
  useEffect(()=>{
    const syncExternal=()=>{const next=savedTheme();setTheme(next);apply(next,false)};
    window.addEventListener("infro-theme-change",syncExternal);
    if(theme!=="system")return()=>window.removeEventListener("infro-theme-change",syncExternal);
    const media=window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem=()=>apply("system",false);
    media.addEventListener?.("change",syncSystem);
    return()=>{window.removeEventListener("infro-theme-change",syncExternal);media.removeEventListener?.("change",syncSystem)};
  },[theme]);
  const cycle=()=>{const next:Theme=theme==="system"?"light":theme==="light"?"dark":"system";setTheme(next);apply(next)};
  const Icon=theme==="dark"?Moon:theme==="light"?Sun:Monitor;
  const nextLabel=theme==="system"?"الفاتح":theme==="light"?"الداكن":"التلقائي";
  const currentLabel=theme==="dark"?"داكن":theme==="light"?"فاتح":"تلقائي";
  const label=`المظهر الحالي: ${currentLabel}. اضغط للتبديل إلى ${nextLabel}.`;
  return <button type="button" onClick={cycle} aria-label={label} title={label} className="infro-theme-toggle group inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 shadow-[0_12px_30px_-20px_rgba(7,24,27,.45)] transition hover:-translate-y-0.5 hover:border-[#9fe8df] hover:text-[#008f87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
    <span className="relative grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-slate-100 transition group-hover:bg-[#e9fbf8]"><Icon className="h-3.5 w-3.5" aria-hidden="true"/></span>
    <span className={showLabel?"inline":"hidden xl:inline"}>{currentLabel}</span>
  </button>;
}
