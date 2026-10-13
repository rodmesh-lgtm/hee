"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { createBookingAlertTracker, type BookingSignal } from "../../app/lib/booking-alert-tracker";

function chime(context: AudioContext) {
  const start = context.currentTime;
  for (const [delay, frequency] of [[0, 880], [0.2, 1174.66]]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start + delay);
    gain.gain.linearRampToValueAtTime(0.16, start + delay + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + delay + 0.8);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(start + delay); oscillator.stop(start + delay + 0.85);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}

export function BookingBell({ businessId }: { businessId: string }) {
  const audio = useRef<AudioContext | null>(null);
  const enabled = useRef(false);
  const [sound, setSound] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const track = createBookingAlertTracker();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      try {
        const response = await fetch(`/api/dashboard/bookings/updates?businessId=${encodeURIComponent(businessId)}`, { cache: "no-store", signal: controller.signal });
        if (stopped) return;
        if ([401, 403, 409].includes(response.status)) {
          setBlocked(true); enabled.current = false; setSound(false);
          setNewCount(0); setNotice("توقفت المتابعة. حدّث الصفحة للتحقق من المنشأة والصلاحيات.");
          return;
        }
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json() as { businessId: string; bookings: BookingSignal[] };
        if (stopped || data.businessId !== businessId || !Array.isArray(data.bookings)) return;
        const count = track(data.bookings);
        setNotice("");
        if (count > 0) {
          setNewCount(current => current + count);
          if (enabled.current && audio.current?.state === "running") chime(audio.current);
          else if (enabled.current) { enabled.current = false; setSound(false); setNotice("أوقف المتصفح الصوت. اضغط تفعيل الجرس مجددًا."); }
        }
      } catch {
        if (!stopped) setNotice("تعذر تحديث الحجوزات مؤقتًا؛ نحاول مجددًا.");
      }
      if (!stopped) timer = setTimeout(poll, 10_000);
    }
    void poll();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); enabled.current = false; void audio.current?.close(); audio.current = null; };
  }, [businessId]);
  async function toggle() {
    if (enabled.current) { enabled.current = false; setSound(false); return; }
    try {
      const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) throw new Error("unsupported");
      audio.current ??= new Audio();
      await audio.current.resume();
      if (audio.current.state !== "running") throw new Error("suspended");
      enabled.current = true; setSound(true); setNotice(""); chime(audio.current);
    } catch { setNotice("تعذر تشغيل الصوت. اسمح بالصوت لهذا الموقع ثم حاول مجددًا."); }
  }
  return <section aria-label="تنبيهات الحجز الجديد" className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">جرس الحجوزات الجديدة</p><p className="mt-1 text-xs leading-5 text-slate-500">{sound ? "الجرس مفعّل ما دامت اللوحة مفتوحة. قد يعلّق المتصفح المتابعة عند قفل الجهاز." : "فعّل الصوت مرة عند فتح اللوحة لتسمع جرسًا عند وصول حجز جديد."}</p></div><button type="button" disabled={blocked} aria-pressed={sound} onClick={toggle} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-800 disabled:opacity-50">{sound ? <BellOff size={17} aria-hidden="true" /> : <Bell size={17} aria-hidden="true" />}{sound ? "كتم جرس الحجوزات" : "تفعيل جرس الحجوزات"}</button></div>{notice ? <p role="status" className="mt-2 text-xs text-amber-800">{notice}</p> : null}{newCount > 0 ? <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-900"><span>وصل حجز جديد · {new Intl.NumberFormat("ar-SA").format(newCount)}</span><Link href="/dashboard/appointments?tab=new" onClick={() => setNewCount(0)} className="inline-flex min-h-11 items-center underline">عرض الحجوزات الجديدة</Link><button type="button" className="min-h-11 px-2 text-xs" onClick={() => setNewCount(0)}>إخفاء التنبيه</button></div> : null}</section>;
}
