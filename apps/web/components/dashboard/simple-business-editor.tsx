"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Eye, Loader2, Palette, RefreshCw, Save, UsersRound } from "lucide-react";
import { publishBusinessAction, unpublishBusinessAction, type PublicationActionState } from "../../app/actions/publication";

type BusinessEditorData = { name: string; shortDescription: string; description: string; phone: string; whatsapp: string; city: string; district: string; googleMapsLink: string; isPublished: boolean; slug: string };
type Props = { business: BusinessEditorData; serviceCount: number; branchCount: number; contactCount: number };
const emptyState: PublicationActionState = {};
const inputClass = "h-11 w-full rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm text-[#20264f] outline-none transition focus:border-[#b7a9ef] focus:bg-white";
const textareaClass = "min-h-[96px] w-full rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 py-3 text-sm text-[#20264f] outline-none transition focus:border-[#b7a9ef] focus:bg-white";
function countLabel(n: number, singular: string, dual: string, plural: string) { if (n === 1) return `${singular} واحد`; if (n === 2) return dual; if (n >= 3 && n <= 10) return `${n} ${plural}`; return `${n} ${singular}`; }

export function SimpleBusinessEditor({ business, serviceCount, branchCount, contactCount }: Props) {
  const [publishState, publishAction, publishPending] = useActionState(publishBusinessAction, emptyState);
  const [fields, setFields] = useState({ name: business.name, shortDescription: business.shortDescription, description: business.description, phone: business.phone, whatsapp: business.whatsapp, city: business.city, district: business.district, googleMapsLink: business.googleMapsLink });
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);
  const lastSaved = useRef(fields);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const [previewVersion, setPreviewVersion] = useState(0);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  useEffect(() => { if (publishState.success) window.location.reload(); }, [publishState.success]);

  const performSave = async (next: typeof fields) => {
    const changed: Record<string, string> = {};
    for (const key of Object.keys(next) as Array<keyof typeof next>) {
      if (next[key] !== lastSaved.current[key]) changed[key] = next[key];
    }
    if (!Object.keys(changed).length) return;

    setStatus("saving");
    setError("");
    try {
      const response = await fetch("/api/dashboard/business/autosave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: changed }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر الحفظ");
      lastSaved.current = next;
      setStatus("saved");
      setPreviewVersion((value) => value + 1);
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "تعذر الحفظ");
    }
  };

  const queueSave = (next: typeof fields) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      // Network responses can arrive out of order. Serialize autosaves so an older
      // request can never finish after a newer edit and overwrite it in the DB.
      saveChain.current = saveChain.current.then(() => performSave(next));
    }, 700);
  };

  const update = (key: keyof typeof fields, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    queueSave(next);
  };

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:[direction:ltr]">
    <div className="space-y-4 xl:[direction:rtl]">
      <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h1 className="text-xl font-black text-[#20264f]">صفحتي</h1><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${business.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{business.isPublished ? "منشورة" : "غير منشورة"}</span></div><p className="mt-1 text-sm text-slate-500">عدّل أهم بيانات هويتك فقط. الحفظ تلقائي والمعاينة تتحدث معك.</p></div><div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${status === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : status === "saving" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "saved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}{status === "saving" ? "جارٍ الحفظ" : status === "saved" ? "تم الحفظ" : error || "تعذر الحفظ"}</div></div></section>

      <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="mb-4"><h2 className="font-black text-[#20264f]">الهوية الأساسية</h2><p className="mt-1 text-xs text-slate-500">هذه المعلومات هي التي يراها العميل أولاً.</p></div><div className="space-y-3"><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>اسم المنشأة</span><input value={fields.name} onChange={(e) => update("name", e.target.value)} className={inputClass} /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>وصف مختصر</span><input value={fields.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} placeholder="سطر واحد يوضح نشاطك" className={inputClass} /></label><details className="rounded-2xl border border-[#eceefa] bg-[#fbfcff] p-3"><summary className="cursor-pointer list-none text-sm font-black text-[#5c49cc]">معلومات إضافية</summary><div className="mt-3"><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>نبذة تفصيلية</span><textarea value={fields.description} onChange={(e) => update("description", e.target.value)} className={textareaClass} /></label></div></details></div></section>

      <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="mb-4"><h2 className="font-black text-[#20264f]">التواصل والموقع</h2><p className="mt-1 text-xs text-slate-500">أضف ما تحتاجه فقط؛ الحقول الفارغة لا تظهر في الصفحة.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>واتساب</span><input value={fields.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} dir="ltr" inputMode="tel" className={inputClass} /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>الهاتف</span><input value={fields.phone} onChange={(e) => update("phone", e.target.value)} dir="ltr" inputMode="tel" className={inputClass} /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>المدينة</span><input value={fields.city} onChange={(e) => update("city", e.target.value)} className={inputClass} /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>الحي</span><input value={fields.district} onChange={(e) => update("district", e.target.value)} className={inputClass} /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600 sm:col-span-2"><span>رابط Google Maps</span><input value={fields.googleMapsLink} onChange={(e) => update("googleMapsLink", e.target.value)} dir="ltr" placeholder="https://maps.google.com/..." className={inputClass} /></label></div></section>

      <section className="grid gap-3 sm:grid-cols-3"><a href="/dashboard/branding" className="rounded-[22px] border border-[#e7e9f4] bg-white p-4 transition hover:border-[#cfc5f5]"><Palette className="h-5 w-5 text-[#6f3bd2]" /><b className="mt-3 block text-sm text-[#20264f]">الشعار والمظهر</b><span className="mt-1 block text-[11px] leading-5 text-slate-500">الشعار، الغلاف والثيمات</span></a><a href="/dashboard/directory" className="rounded-[22px] border border-[#e7e9f4] bg-white p-4 transition hover:border-[#cfc5f5]"><UsersRound className="h-5 w-5 text-[#6f3bd2]" /><b className="mt-3 block text-sm text-[#20264f]">الفروع والفريق</b><span className="mt-1 block text-[11px] leading-5 text-slate-500">{countLabel(branchCount, "فرع", "فرعان", "فروع")} · {countLabel(contactCount, "عضو", "عضوان", "أعضاء")}</span></a><a href="/dashboard/services" className="rounded-[22px] border border-[#e7e9f4] bg-white p-4 transition hover:border-[#cfc5f5]"><BriefcaseBusiness className="h-5 w-5 text-[#6f3bd2]" /><b className="mt-3 block text-sm text-[#20264f]">الخدمات</b><span className="mt-1 block text-[11px] leading-5 text-slate-500">{countLabel(serviceCount, "خدمة", "خدمتان", "خدمات")}</span></a></section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div><b className="text-sm text-[#20264f]">{business.isPublished ? "صفحتك متاحة للزوار" : "جاهز للمشاركة؟"}</b><p className="mt-1 text-xs text-slate-500">{business.isPublished ? "يمكنك فتحها أو إلغاء نشرها مؤقتًا متى احتجت." : "عاين الصفحة أولاً ثم انشرها."}</p></div><div className="flex flex-wrap gap-2"><a href="/preview" target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ddd8f4] bg-white px-4 text-xs font-black text-[#5d49cc]"><Eye className="h-4 w-4" />معاينة</a>{!business.isPublished ? <form action={publishAction}><button disabled={publishPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white disabled:opacity-60"><Save className="h-4 w-4" />{publishPending ? "جارٍ النشر" : "نشر الصفحة"}</button></form> : <><a href={`/${business.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white"><Eye className="h-4 w-4" />فتح الصفحة</a><form action={unpublishBusinessAction}><button className="inline-flex h-10 items-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700">إلغاء النشر</button></form></>}</div>{publishState.error ? <p className="w-full text-xs font-bold text-rose-700">{publishState.error}</p> : null}</section>
    </div>

    <aside className="hidden xl:block xl:[direction:rtl]"><div className="sticky top-24 rounded-[28px] border border-[#e3e6f2] bg-white p-3 shadow-[0_26px_50px_-36px_rgba(31,37,82,.45)]"><div className="mb-3 flex items-center justify-between"><div><b className="text-sm text-[#20264f]">معاينة مباشرة</b><p className="text-[10px] text-slate-400">تتحدث بعد الحفظ</p></div><a href="/preview" target="_blank" className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#f4f1ff] px-2.5 text-[10px] font-black text-[#5d49cc]"><Eye className="h-3.5 w-3.5" />تكبير</a></div><div className="mx-auto w-[292px] overflow-hidden rounded-[30px] border-[6px] border-[#171b2e] bg-white"><iframe key={previewVersion} src={`/preview?v=${previewVersion}`} title="معاينة صفحة النشاط" className="h-[600px] w-full" /></div></div></aside>
  </div>;
}
