"use client";
import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";

export function LivePlayer({ token, expiresAt }: { token: string; expiresAt: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"loading" | "playing" | "ended" | "offline">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = video.current; if (!element) return;
    let disposed = false, player: Hls | undefined, stopped = false;
    const requests = new AbortController();
    function stop(next: "ended" | "offline") {
      stopped = true; player?.destroy(); element!.pause(); element!.removeAttribute("src"); element!.load();
      if (!disposed) setState(next);
    }
    const source = `/api/live-view/${token}/stream/index.m3u8`;
    // Fail closed if status cannot be checked. Also recheck when a suspended
    // background tab returns, instead of trusting its stale UI state.
    async function check() {
      if (stopped || disposed) return;
      if (Date.now() >= Date.parse(expiresAt)) return stop("ended");
      try {
        const response = await fetch(`/api/live-view/${token}`, { cache: "no-store", signal: AbortSignal.any([requests.signal, AbortSignal.timeout(6000)]) });
        if (disposed || stopped) return;
        if (!response.ok) return stop(response.status === 410 ? "ended" : "offline");
        if (!(await response.json()).active) stop("ended");
      } catch { if (!disposed) stop("offline"); }
    }
    const onPlaying = () => { if (!disposed && !stopped) setState("playing"); };
    const onError = () => { if (!disposed) stop("offline"); };
    element.addEventListener("playing", onPlaying); element.addEventListener("error", onError);
    void (async () => {
      await check(); if (disposed || stopped) return;
      const { default: HlsPlayer } = await import("hls.js"); if (disposed || stopped) return;
      if (HlsPlayer.isSupported()) {
        player = new HlsPlayer({ enableWorker: false, lowLatencyMode: false, maxBufferLength: 4, maxMaxBufferLength: 6, backBufferLength: 0 });
        player.on(HlsPlayer.Events.ERROR, (_, data) => { if (data.fatal && !disposed) stop("offline"); });
        player.loadSource(source); player.attachMedia(element);
      } else if (element.canPlayType("application/vnd.apple.mpegurl")) { element.src = source; }
      else stop("offline");
    })().catch(() => { if (!disposed) stop("offline"); });
    const interval = window.setInterval(() => { void check(); }, 3000);
    const visibility = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; requests.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", visibility); element.removeEventListener("playing", onPlaying); element.removeEventListener("error", onError); player?.destroy(); element.pause(); element.removeAttribute("src"); element.load(); };
  }, [token, expiresAt, attempt]);
  return <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#061719] shadow-2xl"><div className="relative aspect-video"><video ref={video} controls autoPlay muted playsInline disablePictureInPicture controlsList="nodownload noremoteplayback" aria-label="البث المباشر لمحطة خدمتك" className={`h-full w-full object-contain ${state === "ended" || state === "offline" ? "hidden" : ""}`} />{state === "loading" && <p role="status" className="absolute left-4 top-4 rounded-xl bg-black/70 px-4 py-2 text-sm text-white">جارٍ الاتصال… اضغط تشغيل إذا لم يبدأ البث.</p>}{(state === "ended" || state === "offline") && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white"><h2 className="text-xl font-bold">{state === "ended" ? "انتهت جلسة المتابعة" : "البث غير متاح الآن"}</h2><p className="text-sm text-slate-400">{state === "ended" ? "أُغلق الوصول إلى الكاميرا. شكرًا لثقتك." : "تحقق من اتصالك أو تواصل مع مقدم الخدمة."}</p>{state === "offline" && <button className="min-h-11 rounded-xl bg-teal-300 px-5 text-sm font-bold text-[#062326]" onClick={() => { setState("loading"); setAttempt(v => v + 1); }}>إعادة المحاولة</button>}</div>}</div><div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs text-slate-400"><span>{state === "playing" ? "● مباشر" : "مشاهدة خاصة"}</span><span>الوصول مرتبط بمدة خدمتك</span></div></section>;
}
