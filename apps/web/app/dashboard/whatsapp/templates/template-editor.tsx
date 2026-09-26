"use client";
import { useActionState, useState } from "react";
import { submitWhatsAppTemplateAction } from "../../../actions/whatsapp-template-editor";

type Template = { id: string; name: string; language: string; category: string; components: unknown };
const control = "mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900";
export function TemplateEditor({ connectionId, templates }: { connectionId: string; templates: Template[] }) {
  const [selected, setSelected] = useState("");
  const template = templates.find((t) => t.id === selected);
  const parts = Array.isArray(template?.components) ? template.components : [];
  const body = parts.find((c) => c.type === "BODY")?.text ?? "";
  const footer = parts.find((c) => c.type === "FOOTER")?.text ?? "";
  const header = parts.find((c) => c.type === "HEADER")?.format ?? "NONE";
  return <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-bold text-slate-900">إنشاء قالب أو تعديل قالب موجود</summary><p className="my-3 text-xs leading-6 text-slate-500">تُرسل التغييرات إلى Meta للمراجعة. تعديل قالب مستخدم قد يوقف إرسال الحملات المرتبطة به إلى حين اعتماده.</p><label className="block text-xs text-slate-600">نوع العملية<select value={selected} onChange={(e) => setSelected(e.target.value)} className={control}><option value="">إنشاء قالب جديد</option>{templates.map((t) => <option key={t.id} value={t.id}>تعديل {t.name} · {t.language}</option>)}</select></label><EditorForm key={selected} connectionId={connectionId} template={template} body={body} footer={footer} header={header}/></details>;
}
function EditorForm({ connectionId, template, body, footer, header }: { connectionId: string; template?: Template; body: string; footer: string; header: string }) {
  const [state, action, pending] = useActionState(submitWhatsAppTemplateAction, { message: "" });
  const [media, setMedia] = useState(["IMAGE", "VIDEO", "DOCUMENT"].includes(header) ? header : "NONE");
  return <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
    <input name="connectionId" type="hidden" value={connectionId}/><input name="templateId" type="hidden" value={template?.id ?? ""}/>
    <label className="text-xs text-slate-600">اسم القالب بالإنجليزية<input name="name" required pattern="[a-z][a-z0-9_]{0,99}" maxLength={100} defaultValue={template?.name} readOnly={Boolean(template)} placeholder="customer_offer" dir="ltr" className={control}/></label>
    <label className="text-xs text-slate-600">اللغة<select name="language" defaultValue={template?.language ?? "ar"} className={control}>{["ar", "en", "en_US", "en_GB"].filter((l) => !template || l === template.language).map((l) => <option key={l}>{l}</option>)}</select></label>
    <label className="text-xs text-slate-600">الفئة<select name="category" defaultValue={template?.category.toUpperCase() ?? "MARKETING"} className={control}><option value="MARKETING">تسويق</option><option value="UTILITY">خدمة مرتبطة بطلب أو حجز</option></select></label>
    <label className="text-xs text-slate-600">رأس الرسالة<select name="header" value={media} onChange={(e) => setMedia(e.target.value)} className={control}><option value="NONE">بدون وسائط</option><option value="IMAGE">صورة</option><option value="VIDEO">فيديو</option><option value="DOCUMENT">PDF</option></select></label>
    {media !== "NONE" ? <label className="text-xs text-slate-600 sm:col-span-2">عينة للمراجعة — حتى 3 MB<input name="sample" type="file" required accept={media === "IMAGE" ? "image/jpeg,image/png" : media === "VIDEO" ? "video/mp4" : "application/pdf"} className={control}/></label> : null}
    <label className="text-xs text-slate-600 sm:col-span-2">نص الرسالة<textarea name="body" required maxLength={1024} defaultValue={body} rows={4} placeholder="مرحبًا {{1}}، تفاصيل عرضنا…" className={control}/></label>
    <label className="text-xs text-slate-600 sm:col-span-2">أمثلة المتغيرات بالترتيب، مفصولة بعلامة |<input name="examples" maxLength={10000} placeholder="أحمد | موعد الصيانة" className={control}/></label>
    <label className="text-xs text-slate-600 sm:col-span-2">التذييل (اختياري)<input name="footer" maxLength={60} defaultValue={footer} className={control}/></label>
    <label className="text-xs text-slate-600">عنوان زر الرابط (اختياري)<input name="buttonText" maxLength={25} className={control}/></label><label className="text-xs text-slate-600">رابط الزر HTTPS<input name="buttonUrl" type="url" maxLength={2048} dir="ltr" className={control}/></label>
    <button disabled={pending} className="min-h-12 rounded-xl bg-[#00bfae] px-4 font-bold text-[#07181b] disabled:opacity-50">{pending ? "جارٍ تقديم الطلب…" : "إرسال إلى Meta للمراجعة"}</button><p role="status" className="text-sm leading-7 text-slate-700">{state.message}</p>
  </form>;
}
