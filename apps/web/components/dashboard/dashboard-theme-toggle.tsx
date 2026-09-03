"use client";
import { useEffect,useState } from "react";
import { Moon,Sun } from "lucide-react";
const KEY="infro-dashboard-theme";
type Theme="light"|"dark";
function workspace(){return document.querySelector<HTMLElement>("[data-dashboard-path]")}
function systemTheme():Theme{return typeof window!=="undefined"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light"}
function savedTheme():Theme|null{try{const value=localStorage.getItem(KEY);return value==="dark"||value==="light"?value:null}catch{return null}}
function apply(theme:Theme,persist=true){const root=workspace();if(root)root.dataset.dashboardTheme=theme;if(persist)try{localStorage.setItem(KEY,theme)}catch{}}
export function DashboardThemeToggle({showLabel=false}:{showLabel?:boolean}){
  const[theme,setTheme]=useState<Theme>("light");
  useEffect(()=>{const chosen=savedTheme()??systemTheme();setTheme(chosen);apply(chosen,Boolean(savedTheme()))},[]);
  const toggle=()=>{const next=theme==="dark"?"light":"dark";setTheme(next);apply(next)};
  const label=theme==="dark"?"التحويل إلى المظهر الفاتح":"التحويل إلى المظهر الداكن";
  return <button type="button" onClick={toggle} aria-label={label} aria-pressed={theme==="dark"} title={label} className="infro-theme-toggle group inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 shadow-[0_12px_30px_-20px_rgba(7,24,27,.45)] transition hover:-translate-y-0.5 hover:border-[#9fe8df] hover:text-[#008f87]">
    <span className="relative grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-slate-100 transition group-hover:bg-[#e9fbf8]">{theme==="dark"?<Sun className="h-3.5 w-3.5"/>:<Moon className="h-3.5 w-3.5"/>}</span>
    <span className={showLabel?"inline":"hidden xl:inline"}>{theme==="dark"?"فاتح":"داكن"}</span>
  </button>;
}
