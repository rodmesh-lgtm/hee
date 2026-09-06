"use client";

import { BrainCircuit, CalendarDays, Mic, Square, UserRound, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 5 * 60;
const LANGUAGE_OPTIONS = [
  ["auto", "تلقائي / Auto"],
  ["ar", "العربية"],
  ["en", "English"],
  ["es", "Español"],
  ["ur", "اردو"],
  ["zh-CN", "中文"],
] as const;

type Suggestion = {
  title: string | null;
  noteType: string;
  summary: string | null;
  outcome: string | null;
  nextAction: string | null;
  stakeholder: string | null;
  responsiblePerson: string | null;
  priority: string;
  workHealth: string;
  businessDueDate: string | null;
  reminderSuggested: boolean;
  reminderTitle: string | null;
  reminderReason: string | null;
};

function recorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const value of ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(value)) return value;
  }
  return "";
}

function extensionFor(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

function errorText(code: string) {
  if (code === "rate_limited") return "تم استخدام الذكاء الاصطناعي عدة مرات خلال فترة قصيرة. حاول بعد قليل.";
  if (code === "voice_unavailable" || code === "ai_unavailable") return "خدمات الذكاء الاصطناعي غير مفعّلة في هذه البيئة بعد.";
  if (code === "unsupported_audio") return "صيغة التسجيل غير مدعومة. جرّب متصفحًا حديثًا أو اكتب المذكرة يدويًا.";
  if (code === "invalid_audio" || code === "file_too_large" || code === "input_too_large") return "المحتوى طويل أو حجمه أكبر من الحد المسموح.";
  if (code === "transcription_timeout" || code === "ai_timeout") return "استغرقت المعالجة وقتًا أطول من المتوقع. حاول مرة أخرى.";
  if (code === "empty_transcript") return "لم أتمكن من استخراج كلام واضح من التسجيل.";
  return "تعذرت المعالجة الذكية الآن. يمكنك متابعة كتابة وحفظ المذكرة يدويًا.";
}

function setFormValue(form: HTMLFormElement | null, name: string, value: string | null, overwrite = false) {
  if (!form || !value) return;
  const field = form.elements.namedItem(name);
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
  if (!overwrite && field.value.trim()) return;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

export function BusinessNoteVoiceTextarea({ voiceAvailable }: { voiceAvailable: boolean }) {
  const [value, setValue] = useState("");
  const [languageHint, setLanguageHint] = useState("auto");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function transcribe(blob: Blob) {
    setProcessing(true);
    setMessage("جارٍ تحويل كلامك إلى نص مع الحفاظ على اللغة واللهجة...");
    try {
      const form = new FormData();
      const type = blob.type || "audio/webm";
      form.set("audio", new File([blob], `business-note.${extensionFor(type)}`, { type }));
      form.set("languageHint", languageHint);
      const response = await fetch("/api/business-notes/voice/transcribe", { method: "POST", body: form, cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; text?: string; code?: string };
      if (!response.ok || !data.ok || !data.text) throw new Error(data.code || "transcription_failed");
      setValue((current) => `${current}${current.trim() ? "\n\n" : ""}${data.text!.trim()}`.slice(0, 8000));
      setSuggestion(null);
      setMessage("تم تحويل التسجيل إلى نص. راجعه، ثم يمكنك طلب ترتيبه كمذكرة أعمال ذكية.");
    } catch (error) {
      setMessage(errorText(error instanceof Error ? error.message : "transcription_failed"));
    } finally {
      setProcessing(false);
    }
  }

  async function organizeMemo() {
    const memo = value.normalize("NFKC").trim();
    if (!memo) { setMessage("اكتب أو سجّل تفاصيل المذكرة أولًا ثم اطلب ترتيبها."); return; }
    if (!voiceAvailable) { setMessage("خدمات الذكاء الاصطناعي غير مفعّلة في هذه البيئة بعد."); return; }
    setOrganizing(true);
    setMessage("INFRO AI يقرأ المذكرة الآن لاستخراج القرار والخطوة التالية ومسؤول التنفيذ دون تغيير كلامك الأصلي...");
    try {
      const response = await fetch("/api/business-notes/organize", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo, languageHint }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; suggestion?: Suggestion; code?: string };
      if (!response.ok || !data.ok || !data.suggestion) throw new Error(data.code || "ai_failed");
      const next = data.suggestion;
      setSuggestion(next);
      const form = textareaRef.current?.form ?? null;
      setFormValue(form, "title", next.title);
      setFormValue(form, "noteType", next.noteType, true);
      setFormValue(form, "summary", next.summary);
      setFormValue(form, "outcome", next.outcome);
      setFormValue(form, "nextAction", next.nextAction);
      setFormValue(form, "stakeholder", next.stakeholder);
      setFormValue(form, "responsiblePerson", next.responsiblePerson);
      setFormValue(form, "priority", next.priority, true);
      setFormValue(form, "workHealth", next.workHealth, true);
      setFormValue(form, "businessDueAt", next.businessDueDate);
      setMessage("تم اقتراح تنظيم المذكرة. بقي النص الأصلي كما هو؛ راجع الحقول المقترحة وعدّلها قبل الحفظ.");
    } catch (error) {
      setMessage(errorText(error instanceof Error ? error.message : "ai_failed"));
    } finally {
      setOrganizing(false);
    }
  }

  async function startRecording() {
    setMessage("");
    if (!voiceAvailable) { setMessage("التحويل الصوتي غير مفعّل في هذه البيئة بعد."); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("هذا المتصفح لا يدعم التسجيل الصوتي المطلوب. يمكنك كتابة المذكرة يدويًا.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = recorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        if (blob.size > 0) void transcribe(blob);
      };
      recorder.start(1000);
      setSeconds(0);
      setRecording(true);
      setMessage("يتم التسجيل الآن. تحدّث بطبيعتك؛ يمكن المزج بين العربية والإنجليزية.");
      timerRef.current = setInterval(() => {
        setSeconds((current) => {
          const next = current + 1;
          if (next >= MAX_SECONDS && recorder.state === "recording") recorder.stop();
          return next;
        });
      }, 1000);
    } catch {
      setMessage("تعذر الوصول إلى الميكروفون. اسمح للمتصفح باستخدامه أو اكتب المذكرة يدويًا.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  return <div className="rounded-2xl border border-slate-200 bg-white">
    <textarea ref={textareaRef} name="body" required maxLength={8000} rows={6} value={value} onChange={(event) => { setValue(event.target.value); setSuggestion(null); }} placeholder="اكتب التفاصيل أو اضغط الميكروفون وتحدث بطبيعتك..." className="w-full resize-y rounded-t-2xl border-0 px-4 py-3 text-sm leading-7 outline-none focus:ring-0"/>
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? <button type="button" onClick={startRecording} disabled={processing || organizing || !voiceAvailable} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#07181b] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Mic className="h-4 w-4"/>تسجيل مذكرة صوتية</button> : <button type="button" onClick={stopRecording} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-black text-white"><Square className="h-4 w-4"/>إيقاف {minutes}:{secs}</button>}
        <button type="button" onClick={organizeMemo} disabled={recording || processing || organizing || !voiceAvailable || !value.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#9ee9df] bg-[#eafffb] px-4 text-xs font-black text-[#006f69] disabled:cursor-not-allowed disabled:opacity-50"><BrainCircuit className={`h-4 w-4 ${organizing ? "animate-pulse" : ""}`}/>{organizing ? "يتم ترتيبها..." : "رتّبها بالذكاء الاصطناعي"}</button>
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><span>لغة الكلام</span><select value={languageHint} onChange={(event) => setLanguageHint(event.target.value)} disabled={recording || processing || organizing} className="bg-transparent font-bold outline-none">{LANGUAGE_OPTIONS.map(([option,label]) => <option key={option} value={option}>{label}</option>)}</select></label>
        {processing ? <span className="inline-flex items-center gap-2 text-xs font-bold text-[#007f76]"><WandSparkles className="h-4 w-4 animate-pulse"/>جارٍ التحويل...</span> : null}
      </div>
      <span className="text-[11px] leading-5 text-slate-500">حتى 5 دقائق · الصوت مؤقت · النص لا يتغير دون مراجعتك</span>
    </div>

    <div className="grid gap-3 border-t border-slate-100 bg-white p-3 sm:grid-cols-3">
      <label className="space-y-1 text-[11px] font-black text-slate-600"><span className="flex items-center gap-1"><BrainCircuit className="h-3.5 w-3.5"/>حالة التنفيذ</span><select name="workHealth" defaultValue="on_track" className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><option value="on_track">على المسار</option><option value="at_risk">معرّض للخطر</option><option value="blocked">متعثر</option></select></label>
      <label className="space-y-1 text-[11px] font-black text-slate-600"><span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5"/>مسؤول التنفيذ</span><input name="responsiblePerson" maxLength={160} placeholder="اسم الشخص أو الفريق" className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
      <label className="space-y-1 text-[11px] font-black text-slate-600"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/>موعد العمل النهائي</span><input type="date" name="businessDueAt" className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
    </div>

    {suggestion?.reminderSuggested ? <div className="border-t border-[#ccefe9] bg-[#f3fcfa] px-4 py-3 text-xs leading-6 text-[#155e59]"><div className="flex items-start gap-2"><WandSparkles className="mt-1 h-4 w-4 shrink-0"/><div><b>اقتراح INFRO: هذه المذكرة تستحق تذكيرًا.</b>{suggestion.reminderTitle ? <span> {suggestion.reminderTitle}</span> : null}{suggestion.reminderReason ? <p className="mt-1 text-[11px] text-slate-600">{suggestion.reminderReason}</p> : null}<p className="mt-1 text-[11px] font-bold">لن يُنشأ أي تذكير تلقائيًا؛ القرار لك بعد مراجعة المذكرة وحفظها.</p></div></div></div> : null}
    {message ? <p role="status" aria-live="polite" className="border-t border-slate-100 px-4 py-3 text-xs font-bold leading-6 text-slate-600">{message}</p> : null}
  </div>;
}
