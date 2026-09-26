"use client";
import { useState } from "react";
import { uploadCampaignMediaAction } from "../../../actions/whatsapp-campaign-media";

import { campaignTemplateFields, resolveCampaignComposition, type Binding, type Composition } from "../../../lib/whatsapp/campaign-composition";

const control = "mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900";
export type PreviewContact = { id: string; displayName: string | null; phoneE164: string; email: string | null; attributes: unknown };
export function MessageComposer({ components, value, onChange, sampleContacts = [] }: { components: unknown; value: Composition; onChange: (value: Composition) => void; sampleContacts?: PreviewContact[] }) {
  const spec = campaignTemplateFields(components);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [sampleId, setSampleId] = useState("");
  const sample = sampleContacts.find((c) => c.id === sampleId);
  const update = (key: string, binding: Binding) => onChange({ ...value, bindings: { ...value.bindings, [key]: binding } });
  let preview: Record<string, string> = {};
  try { preview = resolveCampaignComposition(components, value, sample ?? { displayName: "عميل تجريبي", phoneE164: "+966500000000", email: "example@example.com" }).values; } catch { /* Required fields remain visible below. */ }
  const body = (Array.isArray(components) ? components : []).find((c) => c?.type === "BODY")?.text ?? "";
  return <section className="space-y-4" aria-label="تخصيص رسالة الحملة">
    {sampleContacts.length ? <label className="block text-xs font-bold text-slate-700">بيانات المعاينة<select value={sampleId} onChange={(e) => setSampleId(e.target.value)} className={control}><option value="">بيانات تجريبية</option>{sampleContacts.map((c) => <option key={c.id} value={c.id}>{c.displayName || c.phoneE164}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">المعاينة لا ترسل رسالة ولا تضيف العميل إلى الجمهور المختار.</span></label> : null}
    <label className="block text-xs font-bold text-slate-700">وجهة رابط تتبع الحملة (اختياري)<input type="url" value={value.trackingDestination ?? ""} onChange={(e) => onChange({ ...value, trackingDestination: e.target.value })} placeholder="https://ir.sa/your-page" dir="ltr" className={control}/><span className="mt-1 block text-xs font-normal leading-6 text-slate-500">يتطلب زرًا ديناميكيًا في القالب بعنوان https://ir.sa/api/whatsapp/campaign-link/&#123;&#123;1&#125;&#125;. ضع أي قيمة تجريبية لمتغير الزر؛ ينشئ الخادم رابطًا فريدًا لكل مستلم. يقيس النقرات والحجوزات من نفس المتصفح خلال 7 أيام.</span></label>
    {spec.media ? <label className="block text-xs font-bold text-slate-700">رفع وسائط الإعلان (حتى 3 MB)<input type="file" disabled={uploading} accept={spec.media === "image" ? "image/jpeg,image/png" : spec.media === "video" ? "video/mp4" : "application/pdf"} onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setUploadError(""); const form = new FormData(); form.set("file", file); form.set("kind", spec.media!); try { const result = await uploadCampaignMediaAction(form); if (result.url) onChange({ ...value, mediaUrl: result.url }); else setUploadError(result.error ?? "تعذر الرفع"); } catch { setUploadError("تعذر الاتصال بخدمة الرفع"); } finally { setUploading(false); } }} className={control}/><span role="status" className="mt-1 block text-xs">{uploading ? "جارٍ الرفع…" : uploadError}</span></label> : null}
    {spec.unsupported ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">هذا النوع المتقدم من القوالب غير مدعوم في محرر الحملات الحالي. اختر قالب نص أو صورة أو فيديو أو مستند بأزرار عادية.</p> : null}
    {spec.media ? <label className="block text-xs font-bold text-slate-700">رابط {spec.media === "image" ? "الصورة" : spec.media === "video" ? "الفيديو" : "ملف PDF"} العام (HTTPS)<input aria-label="رابط الوسائط" type="url" value={value.mediaUrl ?? ""} onChange={(e) => onChange({ ...value, mediaUrl: e.target.value })} placeholder="https://…" dir="ltr" className={control}/><span className="mt-1 block text-xs font-normal leading-6 text-slate-500">رابط مباشر يمكن لـ Meta الوصول إليه طوال مدة الحملة. يجب أن يتطابق الملف مع نوع رأس القالب المعتمد.</span></label> : null}
    {spec.fields.map((field) => {
      const b = value.bindings[field.key] ?? { source: "literal", value: "" };
      return <fieldset key={field.key} className="rounded-xl border border-slate-200 p-3"><legend className="px-2 text-xs font-bold text-slate-700">{field.component === "body" ? "نص الرسالة" : field.component === "header" ? "العنوان" : "لاحقة رابط الزر"} · {field.variable}</legend>
        <label className="block text-xs text-slate-600">مصدر القيمة<select aria-label={`مصدر ${field.key}`} value={b.source} onChange={(e) => update(field.key, { ...b, source: e.target.value as Binding["source"] })} className={control}><option value="literal">قيمة ثابتة</option><option value="displayName">اسم العميل</option><option value="phoneE164">رقم الجوال</option><option value="email">البريد الإلكتروني</option><option value="attribute">عمود إضافي من ملف الاستيراد</option></select></label>
        {b.source === "literal" || b.source === "attribute" ? <label className="mt-3 block text-xs text-slate-600">{b.source === "literal" ? "القيمة" : "اسم العمود كما يظهر في ملف الاستيراد"}<input aria-label={`قيمة ${field.key}`} maxLength={1024} value={b.value} onChange={(e) => update(field.key, { ...b, value: e.target.value })} className={control}/></label> : null}
        {b.source !== "literal" ? <label className="mt-3 block text-xs text-slate-600">قيمة بديلة عند غياب البيانات (اختيارية)<input value={b.fallback ?? ""} maxLength={1024} onChange={(e) => update(field.key, { ...b, fallback: e.target.value })} className={control}/></label> : null}
      </fieldset>;
    })}
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-slate-800"><b className="block text-xs text-emerald-800">{sample ? "معاينة ببيانات العميل المختار" : "معاينة توضيحية — بيانات تجريبية"}</b><p className="mt-2 whitespace-pre-wrap">{String(body).replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (original, variable) => preview[`body:${variable}`] ?? original)}</p></div>
    <p className="text-xs leading-6 text-slate-500">يفحص الخادم بيانات جميع المستلمين قبل تثبيت الحملة. إذا غابت قيمة مطلوبة دون بديل فلن تصبح الحملة جاهزة للإرسال.</p>
  </section>;
}
