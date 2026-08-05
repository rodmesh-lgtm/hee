"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type PublicShareButtonProps = {
  title: string;
  text: string;
  url: string;
  label?: string;
  fullWidth?: boolean;
  className?: string;
  variant?: "pill" | "circle";
};

export function PublicShareButton({
  title,
  text,
  url,
  label = "مشاركة",
  fullWidth = false,
  className = "",
  variant = "pill",
}: PublicShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const sharePage = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore user-cancelled share interactions.
    }
  };

  const isCircle = variant === "circle";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={sharePage}
        className={`${fullWidth ? "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm font-bold" : isCircle ? "inline-flex h-11 w-11 items-center justify-center rounded-full" : "rounded-2xl p-3"} border border-white/10 bg-white/5 text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`}
        aria-label="مشاركة الصفحة"
        type="button"
      >
        {fullWidth || !isCircle ? <span>{label}</span> : null}
        <Share2 className={`${isCircle ? "h-4 w-4" : "h-5 w-5"}`} />
      </button>
      {copied ? <span className="text-xs text-emerald-300">تم نسخ الرابط</span> : null}
    </div>
  );
}
