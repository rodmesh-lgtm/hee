"use client";

import { useState, type FormEvent } from "react";
import { Palette, RotateCcw, Check, ArrowUpLeft, Building2 } from "lucide-react";
import { IrMark } from "../brand/ir-logo";
import { identityFontVariables } from "../public-identity-fonts";
import { DEFAULT_IDENTITY_APPEARANCE, IDENTITY_PALETTES, identityAppearanceStyle, normalizeIdentityAppearance, validIdentityColor, type IdentityAppearance } from "../../app/lib/public-identity-appearance";

export function IdentityAppearanceEditor({ businessId, businessName, initialAppearance }: { businessId: string; businessName: string; initialAppearance: IdentityAppearance }) {
  const [value, setValue] = useState(initialAppearance);
  const [saved, setSaved] = useState(initialAppearance);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const valid = [value.primary, value.accent, value.background].every(validIdentityColor);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  function change(next: IdentityAppearance) { setValue(next); setMessage(""); setError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !valid || !dirty) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/dashboard/page-appearance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, appearance: value }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "تعذر حفظ المظهر"); return; }
      const appearance = normalizeIdentityAppearance(result.appearance);
      setValue(appearance); setSaved(appearance); setMessage("تم حفظ مظهر الصفحة وتطبيقه على هويتك الرقمية.");
    } catch { setError("تعذر الاتصال. تحقق من اتصالك ثم حاول مرة أخرى."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="identity-appearance-title" className="rounded-[26px] border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Palette size={20}/></span><div><h2 id="identity-appearance-title" className="text-lg font-black">ألوان وخط الصفحة</h2><p className="mt-1 max-w-2xl text-xs leading-6 text-slate-500">قالب انفرو موحّد لكل المنشآت. خصّص الألوان والخط ليناسبا نشاطك، مع بقاء شعار انفرو وبنية الصفحة ثابتين.</p></div></div>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <form onSubmit={submit} aria-label="تخصيص مظهر الهوية">
        <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-60">
          <legend className="sr-only">إعدادات ألوان وخط الهوية</legend>
          <div><p className="mb-2 text-xs font-bold">مجموعات ألوان جاهزة</p><div className="flex flex-wrap gap-2">{IDENTITY_PALETTES.map(palette => <button key={palette.name} type="button" aria-pressed={value.primary === palette.primary && value.accent === palette.accent && value.background === palette.background} onClick={() => change({ ...value, primary: palette.primary, accent: palette.accent, background: palette.background })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold aria-pressed:border-[#008f87] aria-pressed:ring-1 aria-pressed:ring-[#008f87]"><span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/10" style={{ background: palette.primary }}/>{palette.name}</button>)}</div></div>
          <div className="space-y-3">{([{ key: "primary", label: "اللون الرئيسي والأزرار" }, { key: "accent", label: "لون التفاصيل والزخارف" }, { key: "background", label: "لون خلفية الصفحة" }] as const).map(({ key, label }) => <div key={key} className="flex flex-wrap items-center justify-between gap-2"><label htmlFor={`identity-${key}`} className="text-xs font-bold text-slate-600">{label}</label><div className="flex items-center gap-2"><input type="color" aria-label={`منتقي ${label}`} value={validIdentityColor(value[key]) ? value[key] : DEFAULT_IDENTITY_APPEARANCE[key]} onChange={event => change({ ...value, [key]: event.target.value })} className="h-11 w-11 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-1"/><input id={`identity-${key}`} dir="ltr" type="text" maxLength={7} value={value[key]} spellCheck={false} autoComplete="off" aria-invalid={!validIdentityColor(value[key])} onChange={event => change({ ...value, [key]: event.target.value.toLowerCase() })} className="h-11 w-28 rounded-xl border border-slate-200 px-3 font-mono text-sm uppercase aria-invalid:border-red-500"/></div></div>)}</div>
          {!valid ? <p role="alert" className="text-xs text-red-700">اكتب اللون بالصيغة #123ABC أو استخدم منتقي الألوان.</p> : null}
          <label className="grid gap-2 text-xs font-bold text-slate-600"><span>خط الصفحة</span><select aria-label="خط الصفحة" value={value.font} onChange={event => change({ ...value, font: event.target.value as IdentityAppearance["font"] })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="infro">خط انفرو الافتراضي · IBM Plex Arabic</option><option value="cairo">القاهرة · Cairo</option><option value="tajawal">تجوال · Tajawal</option></select></label>
          <p className="text-xs leading-6 text-slate-500">يتكيّف لون النص تلقائيًا لسهولة القراءة. تظهر التغييرات للزوار بعد الحفظ.</p>
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={!dirty || !valid} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#073d38] px-5 text-xs font-bold text-white disabled:opacity-50"><Check size={16}/>{busy ? "جارٍ الحفظ…" : "حفظ مظهر الصفحة"}</button><button type="button" onClick={() => change({ ...DEFAULT_IDENTITY_APPEARANCE })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold"><RotateCcw size={15}/>استعادة مظهر انفرو</button></div>
        </fieldset>
        {message ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800">{error}</p> : null}
      </form>
      <div><p className="mb-3 text-xs font-bold text-slate-500">معاينة الألوان والخط {dirty ? "· تغييرات غير محفوظة" : "· المظهر المحفوظ"}</p><div data-identity-theme-preview className={`${identityFontVariables} overflow-hidden rounded-3xl border p-6 text-center`} style={{ ...identityAppearanceStyle(value), background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)", fontFamily: "var(--identity-font)" }}>
        <div className="flex justify-end"><span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "#ffffff" }}><IrMark className="h-7"/></span></div>
        <span className="mx-auto mt-2 grid h-16 w-16 place-items-center rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--line)" }}><Building2 size={28}/></span><h3 className="mt-5 break-words text-2xl font-bold">{businessName}</h3><p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>هويتك الرقمية والتسويقية</p><span className="mx-auto my-5 block h-0.5 w-10" style={{ background: "var(--accent)" }}/>
        <div className="rounded-2xl border p-4 text-start" style={{ borderColor: "var(--line)", background: "var(--card)" }}><b className="text-sm">خدماتنا</b><p className="mt-2 text-xs leading-6" style={{ color: "var(--muted)" }}>عرّف عملاءك بنشاطك وخدماتك، وتواصل معهم من صفحة واحدة.</p></div><span className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold" style={{ background: "var(--primary)", color: "var(--on-primary)" }}>تواصل معنا<ArrowUpLeft size={16}/></span>
        <span className="mt-6 inline-block rounded-lg px-3 py-1 text-xs font-bold" style={{ background: "#ffffff", color: "#173c36", fontFamily: "var(--font-inter),sans-serif" }}>INFRO · ir.sa</span>
      </div><a href="/preview" target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#08756e]">معاينة الصفحة كاملة بعد الحفظ<ArrowUpLeft size={15}/></a></div>
    </div>
  </section>;
}
