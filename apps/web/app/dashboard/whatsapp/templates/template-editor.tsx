"use client";
import { useActionState, useState } from "react";
import { submitWhatsAppTemplateAction } from "../../../actions/whatsapp-template-editor";
import { canEditSimpleTemplate } from "../../../lib/whatsapp/template-editor-domain";
import { TEMPLATE_STARTERS } from "../../../lib/whatsapp/template-starters";
import Link from "next/link";

type Template = { id: string; name: string; language: string; category: string; components: unknown };
const control = "mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900";
export function TemplateEditor({ connectionId, templates }: { connectionId?: string; templates: Template[] }) {
  const [selected, setSelected] = useState("");
  const [starterKey, setStarterKey] = useState("");
  const starter = !selected ? TEMPLATE_STARTERS.find(item => item.key === starterKey) : undefined;
  const template = templates.find((t) => t.id === selected);
  const parts = Array.isArray(template?.components) ? template.components : [];
  const body = parts.find((c) => c.type === "BODY")?.text ?? starter?.body ?? "";
  const footer = parts.find((c) => c.type === "FOOTER")?.text ?? "";
  const header = parts.find((c) => c.type === "HEADER")?.format ?? "NONE";
  return <section id="template-studio" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <h2 className="text-lg font-bold text-slate-900">إنشاء قالب أو تعديل قالب موجود</h2>
    <p className="my-3 text-sm leading-7 text-slate-600">اختر نموذجًا يناسب هدفك ثم راجع الرسالة وأرسلها إلى Meta. النماذج مسودات جاهزة للتخصيص وليست قوالب معتمدة مسبقًا.</p>
    <div aria-label="نماذج القوالب" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{TEMPLATE_STARTERS.map(item => <button key={item.key} type="button" aria-pressed={!selected && starterKey === item.key} onClick={() => { setSelected(""); setStarterKey(item.key); }} className={`min-h-20 rounded-xl border p-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] ${!selected && starterKey === item.key ? "border-[#008f87] bg-[#effbf9] text-slate-900" : "border-slate-200 bg-slate-50 text-slate-900"}`}><b className="block text-sm">{item.label}</b><span className="mt-1 block text-xs">{item.category === "MARKETING" ? "تسويق" : item.category === "UTILITY" ? "إشعارات الطلبات والحجوزات" : "مصادقة آمنة"}</span></button>)}</div>
    {starter ? <p role="status" className="mt-3 rounded-xl border border-slate-200 p-3 text-sm leading-7 text-slate-700">{starter.hint}</p> : null}
    {!connectionId ? <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm leading-7 text-slate-700"><p>هذه نماذج INFRO. لإرسالها للمراجعة ومزامنة قوالبك، أكمل ربط رقم هذه المنشأة أولًا.</p><Link href="/dashboard/whatsapp/setup" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#07181b] px-4 font-bold text-white">ربط رقم المنشأة</Link></div> : null}
    <label className="mt-4 block text-sm text-slate-700">نوع العملية<select value={selected} onChange={(e) => setSelected(e.target.value)} className={control}><option value="">إنشاء قالب جديد</option>{templates.filter((t) => t.category !== "authentication" && canEditSimpleTemplate(t.components)).map((t) => <option key={t.id} value={t.id}>تعديل {t.name} · {t.language}</option>)}</select></label>
    <EditorForm key={`${selected}:${starterKey}`} connectionId={connectionId} template={template} body={body} footer={footer} header={header} starter={starter}/>
  </section>;
}
function EditorForm({ connectionId, template, body, footer, header, starter }: { connectionId?: string; template?: Template; body: string; footer: string; header: string; starter?: (typeof TEMPLATE_STARTERS)[number] }) {
  const parts = Array.isArray(template?.components) ? template.components : [];
  const button = parts.find((c) => c.type === "BUTTONS")?.buttons?.[0];
  const [state, action, pending] = useActionState(submitWhatsAppTemplateAction, { message: "" });
  const [media, setMedia] = useState(["IMAGE", "VIDEO", "DOCUMENT"].includes(header) ? header : "NONE");
  const [category, setCategory] = useState<string>(template?.category.toUpperCase() ?? starter?.category ?? "MARKETING");
  const authentication = category === "AUTHENTICATION";
  return <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
    <input name="connectionId" type="hidden" value={connectionId}/><input name="templateId" type="hidden" value={template?.id ?? ""}/>
    <label className="text-xs text-slate-600">اسم القالب بالإنجليزية<input name="name" required pattern="[a-z][a-z0-9_]{0,99}" maxLength={100} defaultValue={template?.name ?? starter?.name} readOnly={Boolean(template)} placeholder="customer_offer" dir="ltr" className={control}/></label>
    <label className="text-xs text-slate-600">اللغة<select name="language" defaultValue={template?.language ?? "ar"} className={control}>{["ar", "en", "en_US", "en_GB"].filter((l) => !template || l === template.language).map((l) => <option key={l}>{l}</option>)}</select></label>
    <label className="text-xs text-slate-600">الفئة<select name="category" value={category} onChange={event => setCategory(event.target.value)} className={control}><option value="MARKETING">تسويق</option><option value="UTILITY">خدمة مرتبطة بطلب أو حجز</option>{!template ? <option value="AUTHENTICATION">رمز التحقق OTP</option> : null}</select></label>
    {authentication ? <>
      <input type="hidden" name="header" value="NONE"/>
      <label className="text-sm text-slate-700">صلاحية الرمز بالدقائق<input type="number" name="codeExpirationMinutes" min={1} max={90} step={1} defaultValue={10} required className={control}/></label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 sm:col-span-2"><b className="block text-slate-900">معاينة توضيحية لرمز التحقق</b><p>123456 هو رمز التحقق الخاص بك. حفاظًا على أمانك، لا تشارك هذا الرمز.</p><span className="mt-2 inline-block rounded-lg border border-slate-300 px-4 py-2 font-bold">نسخ الرمز</span><p className="mt-3">Meta يحدد النص النهائي حسب اللغة. مدة الصلاحية هنا تظهر في الرسالة؛ يجب أن يطبّق نظام التحقق انتهاء الرمز ومنع إعادة استخدامه. إنشاء القالب لا يفعّل خدمة OTP تلقائيًا ولا يرسل رسائل.</p></div>
    </> : <>
    <label className="text-xs text-slate-600">رأس الرسالة<select name="header" value={media} onChange={(e) => setMedia(e.target.value)} className={control}><option value="NONE">بدون وسائط</option><option value="IMAGE">صورة</option><option value="VIDEO">فيديو</option><option value="DOCUMENT">PDF</option></select></label>
    {media !== "NONE" ? <label className="text-xs text-slate-600 sm:col-span-2">عينة للمراجعة — حتى 3 MB<input name="sample" type="file" required accept={media === "IMAGE" ? "image/jpeg,image/png" : media === "VIDEO" ? "video/mp4" : "application/pdf"} className={control}/></label> : null}
    <label className="text-xs text-slate-600 sm:col-span-2">نص الرسالة<textarea name="body" required maxLength={1024} defaultValue={body} rows={4} placeholder="مرحبًا {{1}}، تفاصيل عرضنا…" className={control}/></label>
    <label className="text-xs text-slate-600 sm:col-span-2">أمثلة المتغيرات بالترتيب، مفصولة بعلامة |<input name="examples" defaultValue={starter?.examples ?? ""} maxLength={10000} placeholder="أحمد | موعد الصيانة" className={control}/></label>
    <label className="text-xs text-slate-600 sm:col-span-2">التذييل (اختياري)<input name="footer" maxLength={60} defaultValue={footer} className={control}/></label>
    <label className="text-xs text-slate-600">عنوان زر الرابط (اختياري)<input name="buttonText" maxLength={25} defaultValue={button?.text ?? ""} className={control}/></label><label className="text-xs text-slate-600">رابط الزر HTTPS<input name="buttonUrl" defaultValue={button?.url ?? ""} type="url" maxLength={2048} dir="ltr" className={control}/></label>
    </>}
    <button disabled={pending || !connectionId} className="min-h-12 rounded-xl bg-[#07181b] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? "جارٍ تقديم الطلب…" : "إرسال إلى Meta للمراجعة"}</button><p role="status" className="text-sm leading-7 text-slate-700">{state.message}</p>
  </form>;
}
