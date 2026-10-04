"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitWhatsAppTemplateAction } from "../../../actions/whatsapp-template-editor";
import { buildTemplateSubmission, canEditSimpleTemplate, templateValidationError } from "../../../lib/whatsapp/template-editor-domain";
import { TEMPLATE_GROUPS, TEMPLATE_STARTERS, starterGroup } from "../../../lib/whatsapp/template-starters";
import { FileText, MessageCircle, Plus, Search, Sparkles, CheckCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { startTemplateMediaUploadAction, uploadTemplateMediaChunkAction } from "../../../actions/whatsapp-template-media";
import { TEMPLATE_MEDIA_CHUNK_BYTES, templateMediaLimit, validateTemplateMedia } from "../../../lib/whatsapp/template-media-domain";

type Template = { id: string; name: string; language: string; category: string; status?: string; components: unknown };
const control = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20";
export function TemplateEditor({ connectionId, templates }: { connectionId?: string; templates: Template[] }) {
  const [selected, setSelected] = useState("");
  const [starterKey, setStarterKey] = useState("");
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const starter = !selected ? TEMPLATE_STARTERS.find(item => item.key === starterKey) : undefined;
  const template = templates.find((t) => t.id === selected);
  const parts = Array.isArray(template?.components) ? template.components : [];
  const body = parts.find((c) => c.type === "BODY")?.text ?? starter?.body ?? "";
  const footer = parts.find((c) => c.type === "FOOTER")?.text ?? "";
  const header = parts.find((c) => c.type === "HEADER")?.format ?? (starter?.key === "catalog" ? "DOCUMENT" : "NONE");
  return <section id="template-studio" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <h2 className="text-lg font-bold text-slate-900">إنشاء قالب أو تعديل قالب موجود</h2>
    <p className="my-3 text-sm leading-7 text-slate-600">اختر نموذجًا يناسب هدفك ثم راجع الرسالة وأرسلها إلى Meta. النماذج مسودات جاهزة للتخصيص وليست قوالب معتمدة مسبقًا.</p>
    <div className="my-5 flex flex-wrap items-center justify-between gap-3"><label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-3"><Search className="h-4 w-4"/><input aria-label="ابحث عن نموذج جاهز" value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن رسالة تناسبك" className="min-w-0 bg-transparent py-3 text-base outline-none"/></label><button type="button" onClick={() => { setSelected(""); setStarterKey("custom"); }} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#07181b] px-5 font-bold text-white"><Plus className="h-5 w-5"/>إنشاء قالب مخصص</button></div>
    <div aria-label="تصنيفات النماذج" className="mb-4 flex flex-wrap gap-2">{TEMPLATE_GROUPS.map(item => <button key={item.key} type="button" aria-pressed={group === item.key} onClick={() => setGroup(item.key)} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${group === item.key ? "border-teal-600 bg-teal-50 text-teal-900" : "border-slate-200 text-slate-700"}`}>{item.label} <span className="ms-1 opacity-70">{TEMPLATE_STARTERS.filter(starter => item.key === "all" || starterGroup(starter.key) === item.key).length}</span></button>)}</div>
    <div aria-label="نماذج القوالب" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{TEMPLATE_STARTERS.filter(item => (group === "all" || starterGroup(item.key) === group) && `${item.label} ${item.name}`.toLowerCase().includes(query.trim().toLowerCase())).map(item => <button key={item.key} type="button" aria-pressed={!selected && starterKey === item.key} onClick={() => { setSelected(""); setStarterKey(item.key); }} className={`rounded-2xl border p-4 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] ${!selected && starterKey === item.key ? "border-[#008f87] bg-[#effbf9] text-slate-900" : "border-slate-200 bg-slate-50 text-slate-900 hover:border-teal-500"}`}><b className="flex items-center justify-between gap-2 text-base">{item.label}<Sparkles className="h-4 w-4 shrink-0 text-teal-700"/></b><span className="mt-2 block text-sm text-slate-600">{item.category === "MARKETING" ? "تسويق" : item.category === "UTILITY" ? "إشعارات الطلبات والحجوزات" : "مصادقة آمنة"} · {new Set(item.body.match(/\{\{\d+\}\}/g) ?? []).size} متغيرات</span><span className="mt-3 line-clamp-2 block text-sm leading-7 text-slate-600">{item.body || "رمز تحقق آمن مع زر النسخ والنص المعتمد للمصادقة."}</span><span className="mt-3 block text-sm font-bold text-teal-700">تخصيص وإرسال للمراجعة ←</span></button>)}</div>
    {!TEMPLATE_STARTERS.some(item => (group === "all" || starterGroup(item.key) === group) && `${item.label} ${item.name}`.toLowerCase().includes(query.trim().toLowerCase())) ? <p role="status" className="p-5 text-center text-slate-600">لا توجد نماذج مطابقة. غيّر البحث أو أنشئ قالبًا مخصصًا.</p> : null}
    {starter ? <p role="status" className="mt-3 rounded-xl border border-slate-200 p-3 text-sm leading-7 text-slate-700">{starter.hint}</p> : null}
    {!connectionId ? <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm leading-7 text-slate-700"><p>هذه نماذج INFRO. لإرسالها للمراجعة ومزامنة قوالبك، أكمل ربط رقم هذه المنشأة أولًا.</p><Link href="/dashboard/whatsapp/setup" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#07181b] px-4 font-bold text-white">ربط رقم المنشأة</Link></div> : null}
    <label className="mt-6 block text-sm font-bold text-slate-700">نوع العملية<select value={selected} onChange={(e) => setSelected(e.target.value)} className={control}><option value="">إنشاء قالب جديد{starter ? ` · ${starter.label}` : " · مخصص"}</option>{templates.filter((t) => t.status !== "pending" && t.category !== "authentication" && canEditSimpleTemplate(t.components)).map((t) => <option key={t.id} value={t.id}>تعديل {t.name} · {t.language}</option>)}</select></label>
    <EditorForm key={`${selected}:${starterKey}`} connectionId={connectionId} template={template} body={body} footer={footer} header={header} starter={starter}/>
  </section>;
}
function EditorForm({ connectionId, template, body, footer, header, starter }: { connectionId?: string; template?: Template; body: string; footer: string; header: string; starter?: (typeof TEMPLATE_STARTERS)[number] }) {
  const parts = Array.isArray(template?.components) ? template.components : [];
  const button = parts.find((c) => c.type === "BUTTONS")?.buttons?.[0];
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (previous: Parameters<typeof submitWhatsAppTemplateAction>[0], form: FormData): Promise<Awaited<ReturnType<typeof submitWhatsAppTemplateAction>>> => {
    const sample = form.get("sample"); form.delete("sample");
    const get = (name: string) => String(form.get(name) ?? "").trim();
    // Validate all templates before uploading a sample or consuming a server attempt.
    try {
      buildTemplateSubmission({ name: get("name"), language: get("language"), category: get("category"), body: get("body"), footer: get("footer"), header: get("header"), examples: get("examples"), buttonText: get("buttonText"), buttonUrl: get("buttonUrl"), mediaHandle: "validated-after-upload", codeExpirationMinutes: Number(get("codeExpirationMinutes")) });
    } catch (error) {
      return templateValidationError(error) ?? { message: "راجع إعدادات قالب OTP: مدة الصلاحية من 1 إلى 90 دقيقة، دون نص مخصص أو وسائط." };
    }
    if (get("header") !== "NONE" && get("category") !== "AUTHENTICATION") {
      try {
        if (!(sample instanceof File)) throw new Error("sample");
        validateTemplateMedia(get("header"), sample.type, sample.size);
        setUploadProgress(0);
        const started = await startTemplateMediaUploadAction({ connectionId: get("connectionId"), header: get("header"), mime: sample.type, size: sample.size });
        if (!started.ticket) return { message: started.error ?? "تعذر رفع العينة." };
        let ticket = started.ticket;
        for (let offset = 0; offset < sample.size; offset += TEMPLATE_MEDIA_CHUNK_BYTES) {
          const chunk = new FormData(); chunk.set("connectionId", get("connectionId")); chunk.set("ticket", ticket);
          chunk.set("chunk", sample.slice(offset, offset + TEMPLATE_MEDIA_CHUNK_BYTES), "chunk");
          const result = await uploadTemplateMediaChunkAction(chunk);
          if (!result.ticket) return { message: result.error ?? "تعذر إكمال رفع العينة." };
          ticket = result.ticket;
          setUploadProgress(Math.round((result.uploaded ?? 0) / sample.size * 100));
          if (offset + TEMPLATE_MEDIA_CHUNK_BYTES >= sample.size && !result.completed) throw new Error("incomplete");
        }
        form.set("mediaTicket", ticket);
      } catch { return { message: "تعذر تجهيز العينة. راجع نوع الملف وحجمه والنص والمتغيرات، ثم أعد المحاولة. لم يُرسل القالب للمراجعة." }; }
      finally { setUploadProgress(null); }
    }
    return submitWhatsAppTemplateAction(previous, form);
  }, { message: "" });
  useEffect(() => {
    if (!state.field) return;
    const field = formRef.current?.elements.namedItem(state.field);
    if (field instanceof HTMLElement) field.focus();
  }, [state]);
  const [media, setMedia] = useState(["IMAGE", "VIDEO", "DOCUMENT"].includes(header) ? header : "NONE");
  const [category, setCategory] = useState<string>(template?.category.toUpperCase() ?? starter?.category ?? "MARKETING");
  const authentication = category === "AUTHENTICATION";
  const [message, setMessage] = useState(body);
  const [examples, setExamples] = useState<string>(parts.find(c => c.type === "BODY")?.example?.body_text?.[0]?.join(" | ") ?? starter?.examples ?? "");
  const [footerText, setFooterText] = useState(footer);
  const [buttonText, setButtonText] = useState<string>(button?.text ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [sampleUrl, setSampleUrl] = useState("");
  function updateFile(sample: File | null) { setFile(sample); setSampleUrl(sample ? URL.createObjectURL(sample) : ""); }
  useEffect(() => () => { if (sampleUrl) URL.revokeObjectURL(sampleUrl); }, [sampleUrl]);
  const preview = message.replace(/\{\{(\d+)\}\}/g, (variable, index) => examples.split("|")[Number(index) - 1]?.trim() || variable);
  return <form ref={formRef} action={action} onReset={event => event.preventDefault()} className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]"><fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
    <input name="connectionId" type="hidden" value={connectionId}/><input name="templateId" type="hidden" value={template?.id ?? ""}/>
    <label className="text-sm text-slate-600">اسم القالب بالإنجليزية<input name="name" required pattern="[a-z][a-z0-9_]{0,99}" maxLength={100} defaultValue={template?.name ?? starter?.name} readOnly={Boolean(template)} placeholder="customer_offer" dir="ltr" className={control}/></label>
    <label className="text-sm text-slate-600">اللغة<select name="language" defaultValue={template?.language ?? "ar"} className={control}>{["ar", "en", "en_US", "en_GB"].filter((l) => !template || l === template.language).map((l) => <option key={l}>{l}</option>)}</select></label>
    <label className="text-sm text-slate-600">الفئة<select name="category" value={category} onChange={event => setCategory(event.target.value)} className={control}><option value="MARKETING">تسويق</option><option value="UTILITY">خدمة مرتبطة بطلب أو حجز</option>{!template ? <option value="AUTHENTICATION">رمز التحقق OTP</option> : null}</select></label>
    {authentication ? <>
      <input type="hidden" name="header" value="NONE"/>
      <label className="text-sm text-slate-700">صلاحية الرمز بالدقائق<input type="number" name="codeExpirationMinutes" min={1} max={90} step={1} defaultValue={10} required className={control}/></label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 sm:col-span-2"><b className="block text-slate-900">معاينة توضيحية لرمز التحقق</b><p>123456 هو رمز التحقق الخاص بك. حفاظًا على أمانك، لا تشارك هذا الرمز.</p><span className="mt-2 inline-block rounded-lg border border-slate-300 px-4 py-2 font-bold">نسخ الرمز</span><p className="mt-3">Meta يحدد النص النهائي حسب اللغة. مدة الصلاحية هنا تظهر في الرسالة؛ يجب أن يطبّق نظام التحقق انتهاء الرمز ومنع إعادة استخدامه. إنشاء القالب لا يفعّل خدمة OTP تلقائيًا ولا يرسل رسائل.</p></div>
    </> : <>
    <label className="text-sm text-slate-600">رأس الرسالة<select name="header" value={media} onChange={(e) => { setMedia(e.target.value); updateFile(null); }} className={control}><option value="NONE">بدون وسائط</option><option value="IMAGE">صورة</option><option value="VIDEO">فيديو</option><option value="DOCUMENT">PDF</option></select></label>
    {media !== "NONE" ? <label className="text-sm text-slate-600 sm:col-span-2">عينة للمراجعة — حتى {templateMediaLimit(media)} MB<input key={media} name="sample" type="file" required onChange={event => { const sample = event.target.files?.[0]; if (sample && sample.size > templateMediaLimit(media) * 1024 * 1024) { event.target.setCustomValidity(`الحد الأقصى لهذا النوع ${templateMediaLimit(media)} MB`); event.target.reportValidity(); updateFile(null); } else { event.target.setCustomValidity(""); updateFile(sample ?? null); } }} accept={media === "IMAGE" ? "image/jpeg,image/png" : media === "VIDEO" ? "video/mp4" : "application/pdf"} className={control}/></label> : null}
    <label className="text-sm text-slate-600 sm:col-span-2">نص الرسالة<textarea name="body" required maxLength={1024} value={message} onChange={event => setMessage(event.target.value)} rows={5} placeholder="مرحبًا {{1}}، تفاصيل عرضنا…" className={control}/><span className="mt-1 block">{message.length} / 1024 حرف</span></label>
    <label className="text-sm text-slate-600 sm:col-span-2">أمثلة المتغيرات بالترتيب، مفصولة بعلامة |<input name="examples" value={examples} onChange={event => setExamples(event.target.value)} maxLength={10000} placeholder="أحمد | موعد الصيانة" className={control}/><span className="mt-1 block leading-7">{new Set(message.match(/\{\{\d+\}\}/g) ?? []).size ? `عدد المتغيرات: ${new Set(message.match(/\{\{\d+\}\}/g) ?? []).size}. أدخل مثالًا لكل متغير للمراجعة.` : "لا تحتاج أمثلة إذا كانت رسالتك بدون متغيرات."}</span></label>
    <label className="text-sm text-slate-600 sm:col-span-2">التذييل (اختياري)<input name="footer" maxLength={60} value={footerText} onChange={event => setFooterText(event.target.value)} className={control}/></label>
    <label className="text-sm text-slate-600">عنوان زر الرابط (اختياري)<input name="buttonText" maxLength={25} value={buttonText} onChange={event => setButtonText(event.target.value)} className={control}/></label><label className="text-sm text-slate-600">رابط الزر HTTPS<input name="buttonUrl" defaultValue={button?.url ?? ""} type="url" maxLength={2048} dir="ltr" className={control}/></label>
    </>}
    <button disabled={pending || !connectionId || Boolean(state.outcome && state.outcome !== "rejected")} className="min-h-12 rounded-xl bg-[#07181b] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? uploadProgress !== null ? `جارٍ رفع العينة… ${uploadProgress}%` : "جارٍ تقديم الطلب…" : state.outcome === "accepted" ? "تم تقديم القالب" : "إرسال إلى Meta للمراجعة"}</button>
    {uploadProgress !== null ? <div role="status" className="text-sm text-slate-700 sm:col-span-2"><progress aria-label="تقدم رفع العينة" max={100} value={uploadProgress} className="w-full"/><p>رفع العينة {uploadProgress}% — اترك الصفحة مفتوحة حتى اكتمال التقديم.</p></div> : null}
    {state.message ? <div role="status" className={`rounded-xl border p-4 text-sm leading-7 sm:col-span-2 ${state.outcome === "accepted" ? "border-teal-300 bg-teal-50 text-teal-950" : "border-amber-300 bg-amber-50 text-amber-950"}`}><p>{state.message}</p>{state.reference ? <p>مرجع الطلب: <b dir="ltr">{state.reference}</b></p> : null}<Link href={`/dashboard/whatsapp/templates?connectionId=${encodeURIComponent(connectionId ?? "")}#template-library`} className="mt-2 inline-flex min-h-11 items-center font-bold underline">متابعة القوالب في المكتبة</Link></div> : null}
  </fieldset>{!authentication ? <aside aria-label="معاينة رسالة واتساب" className="min-w-0 overflow-hidden rounded-[28px] border border-slate-300 bg-slate-50 xl:sticky xl:top-24"><div className="flex items-center gap-3 bg-[#075e54] p-5 text-white"><MessageCircle className="h-8 w-8"/><div><b className="block text-base">منشأتك</b><span className="text-sm text-white/80">معاينة توضيحية · WhatsApp</span></div></div><div className="min-h-72 p-4 sm:p-6"><div className="overflow-hidden rounded-2xl rounded-tr-sm border border-slate-200 bg-white shadow-sm">{media !== "NONE" ? <div className="m-2 overflow-hidden rounded-xl bg-slate-100">{sampleUrl && media === "IMAGE" ? <Image unoptimized width={600} height={400} src={sampleUrl} alt="عينة صورة القالب" className="max-h-72 w-full object-contain"/> : sampleUrl && media === "VIDEO" ? <video src={sampleUrl} controls className="max-h-72 w-full"/> : <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-4 text-slate-600"><FileText className="h-8 w-8"/><span className="break-all text-sm">{file?.name ?? `أرفق ${media === "IMAGE" ? "صورة" : media === "VIDEO" ? "فيديو" : "ملف PDF"} للمعاينة`}</span></div>}</div> : null}<p dir="auto" className="whitespace-pre-wrap break-words p-4 text-base leading-8 text-slate-900">{preview || "اكتب رسالتك لتظهر المعاينة هنا."}</p>{footerText ? <p className="px-4 pb-3 text-sm text-slate-500">{footerText}</p> : null}<div className="flex justify-end px-4 pb-2 text-sky-600"><CheckCheck className="h-4 w-4"/></div>{buttonText ? <div className="border-t border-slate-200 p-3 text-center font-bold text-teal-700">↗ {buttonText}</div> : null}</div><p className="mt-4 text-sm leading-7 text-slate-600">الأمثلة للعرض ومراجعة Meta. بيانات العميل والوسائط النهائية تُحدد عند الإرسال.</p></div></aside> : null}</form>;
}
