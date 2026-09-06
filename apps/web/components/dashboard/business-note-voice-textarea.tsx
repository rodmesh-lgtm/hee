"use client";

import { Mic, Square, WandSparkles } from "lucide-react";
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
  if (code === "rate_limited") return "تم استخدام التحويل الصوتي عدة مرات خلال فترة قصيرة. حاول بعد قليل.";
  if (code === "voice_unavailable") return "التحويل الصوتي غير مفعّل في هذه البيئة بعد.";
  if (code === "unsupported_audio") return "صيغة التسجيل غير مدعومة. جرّب متصفحًا حديثًا أو اكتب المذكرة يدويًا.";
  if (code === "invalid_audio" || code === "file_too_large") return "التسجيل طويل أو حجمه أكبر من الحد المسموح.";
  if (code === "transcription_timeout") return "استغرق التحويل وقتًا أطول من المتوقع. حاول مرة أخرى.";
  if (code === "empty_transcript") return "لم أتمكن من استخراج كلام واضح من التسجيل.";
  return "تعذر تحويل التسجيل إلى نص الآن. يمكنك متابعة الكتابة يدويًا.";
}

export function BusinessNoteVoiceTextarea({ voiceAvailable }: { voiceAvailable: boolean }) {
  const [value, setValue] = useState("");
  const [languageHint, setLanguageHint] = useState("auto");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
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
      setMessage("تم تحويل التسجيل إلى نص. راجعه وعدّله قبل حفظ المذكرة.");
    } catch (error) {
      setMessage(errorText(error instanceof Error ? error.message : "transcription_failed"));
    } finally {
      setProcessing(false);
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
    <textarea name="body" required maxLength={8000} rows={6} value={value} onChange={(event) => setValue(event.target.value)} placeholder="اكتب التفاصيل أو اضغط الميكروفون وتحدث بطبيعتك..." className="w-full resize-y rounded-t-2xl border-0 px-4 py-3 text-sm leading-7 outline-none focus:ring-0"/>
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? <button type="button" onClick={startRecording} disabled={processing || !voiceAvailable} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#07181b] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Mic className="h-4 w-4"/>تسجيل مذكرة صوتية</button> : <button type="button" onClick={stopRecording} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-black text-white"><Square className="h-4 w-4"/>إيقاف {minutes}:{secs}</button>}
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><span>لغة الكلام</span><select value={languageHint} onChange={(event) => setLanguageHint(event.target.value)} disabled={recording || processing} className="bg-transparent font-bold outline-none">{LANGUAGE_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {processing ? <span className="inline-flex items-center gap-2 text-xs font-bold text-[#007f76]"><WandSparkles className="h-4 w-4 animate-pulse"/>جارٍ التحويل...</span> : null}
      </div>
      <span className="text-[11px] leading-5 text-slate-500">حتى 5 دقائق · لا يُحفظ التسجيل الصوتي بعد التحويل</span>
    </div>
    {message ? <p role="status" aria-live="polite" className="border-t border-slate-100 px-4 py-3 text-xs font-bold leading-6 text-slate-600">{message}</p> : null}
  </div>;
}
