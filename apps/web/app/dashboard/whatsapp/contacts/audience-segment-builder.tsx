import { Layers3, LockKeyhole, Plus } from "lucide-react";
import { createEligibleAudienceSegmentAction } from "../../../actions/whatsapp-audience-segments";

const buttonFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2";

type SegmentSummary = {
  id: string;
  name: string;
  _count: { memberships: number };
};

export function AudienceSegmentBuilder({
  eligibleCount,
  segments,
  result,
  createdCount,
}: {
  eligibleCount: number;
  segments: SegmentSummary[];
  result?: string;
  createdCount?: string;
}) {
  return <section id="segments" className="rounded-[24px] border border-slate-200 bg-white p-4">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Layers3 className="h-4 w-4"/></span>
      <div><b className="block text-xs text-slate-900">منشئ الشرائح</b><p className="mt-1 text-[9px] leading-5 text-slate-500">احفظ لقطة من الجمهور المؤهل الآن لتستخدمها لاحقًا داخل Campaign Studio.</p></div>
    </div>

    {segmentNotice(result, createdCount)}

    <form action={createEligibleAudienceSegmentAction} className="mt-4 space-y-3">
      <label className="block text-[10px] font-bold text-slate-600">اسم الشريحة
        <input name="name" required minLength={1} maxLength={80} placeholder="مثال: عملاء حملة سبتمبر" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs outline-none transition focus:border-[#8ddfd6] focus:ring-2 focus:ring-[#00bfae]/10"/>
      </label>
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[9px] leading-5 text-slate-500"><LockKeyhole className="mb-1 h-3.5 w-3.5 text-[#008f87]"/>الشريحة لا تمنح موافقة جديدة ولا تتجاوز Opt-out. عند إنشاء الحملة يعاد فحص أهلية كل رقم قبل تثبيت المستلمين.</div>
      <button type="submit" disabled={eligibleCount < 1} className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07181b] px-4 text-xs font-black text-white transition hover:bg-[#0d2a2e] disabled:cursor-not-allowed disabled:opacity-40 ${buttonFocus}`}><Plus className="h-4 w-4"/>حفظ {eligibleCount} جهة مؤهلة كشريحة</button>
    </form>

    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between"><b className="text-[10px] text-slate-700">الشرائح المحفوظة</b><span className="text-[9px] text-slate-400">{segments.length} ظاهرة</span></div>
      {segments.length ? <div className="mt-3 flex flex-wrap gap-2">{segments.map((segment)=><span key={segment.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-bold text-slate-600">{segment.name} · {segment._count.memberships}</span>)}</div> : <p className="mt-3 text-[9px] leading-5 text-slate-400">لم تُحفظ أي شريحة بعد. أنشئ أول شريحة عندما يصبح لديك جمهور مؤهل.</p>}
    </div>
  </section>;
}

function segmentNotice(result?: string, createdCount?: string) {
  if (!result) return null;
  const message = result === "created"
    ? `تم حفظ الشريحة بنجاح${/^\d+$/.test(createdCount ?? "") ? ` · ${createdCount} جهة` : ""}.`
    : result === "exists" ? "يوجد اسم شريحة مطابق بالفعل. اختر اسمًا مختلفًا."
      : result === "limit" ? "وصل النشاط إلى الحد التشغيلي للشرائح الثابتة. راجع الشرائح الحالية قبل إنشاء المزيد."
        : result === "empty" ? "لا يوجد جمهور مؤهل حاليًا لحفظه كشريحة."
          : result === "invalid" ? "أدخل اسم شريحة صالحًا لا يتجاوز 80 حرفًا."
            : "تعذر حفظ الشريحة الآن. لم تُضف أي عضويات جزئية.";
  const ok = result === "created";
  return <div role="status" aria-live="polite" className={`mt-4 rounded-xl border px-3 py-2 text-[9px] font-bold leading-5 ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{message}</div>;
}
