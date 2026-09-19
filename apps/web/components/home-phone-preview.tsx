"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpLeft } from "lucide-react";

// Keep the embedded page at an actual mobile viewport, even on a desktop.
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

export function HomePhonePreview() {
  const screenRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const screen = screenRef.current;
    const frame = frameRef.current;
    if (!screen || !frame) return;
    const resize = () => {
      frame.style.transform = `scale(${screen.clientWidth / PHONE_WIDTH})`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(screen);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="mx-auto w-full max-w-[320px]" aria-label="معاينة صفحة العميل داخل هاتف">
      <div className="infro-phone-frame rounded-[44px] border border-slate-600 bg-[#102329] p-2 shadow-[0_32px_65px_-28px_rgba(7,24,27,.45)] ring-1 ring-white/60">
        <div className="flex h-6 items-center justify-center" aria-hidden="true">
          <span className="h-1 w-12 rounded-full bg-slate-500/60" />
        </div>
        <div ref={screenRef} data-home-phone-screen className="relative isolate aspect-[390/844] overflow-hidden rounded-[32px] bg-[#edf4f7]" inert>
          <iframe
            ref={frameRef}
            src="/demo"
            title="نموذج صفحة عميل INFRO"
            width={PHONE_WIDTH}
            height={PHONE_HEIGHT}
            tabIndex={-1}
            loading="lazy"
            className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left border-0"
            style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT, transform: "scale(.77)" }}
          />
        </div>
        <div className="flex h-5 items-center justify-center" aria-hidden="true">
          <span className="h-1 w-20 rounded-full bg-slate-500/60" />
        </div>
      </div>
      <figcaption className="mt-4 text-center">
        <Link href="/demo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#cfe5e1] bg-white px-4 text-sm font-bold text-[#07545d] shadow-sm hover:bg-[#effbf9]">
          استكشف صفحة العميل <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-1 text-xs text-slate-500">صفحة نموذجية ببيانات توضيحية</p>
      </figcaption>
    </figure>
  );
}
