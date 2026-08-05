"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Link2 } from "lucide-react";
import { PublicShareButton } from "./public-share-button";

type PublicQrCardProps = {
  qrDataUrl: string;
  publicUrl: string;
  accentColor?: string;
};

export function PublicQrCard({ qrDataUrl, publicUrl, accentColor = "#5D43EF" }: PublicQrCardProps) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-[20px] border border-[#e8ebf7] bg-white p-4">
      <h2 className="mb-1 text-xl font-black text-[#1f2552]">شارك صفحة النشاط</h2>
      <p className="text-xs text-slate-500">امسح الرمز أو انسخ الرابط مباشرة</p>
      <div className="mt-4 rounded-[24px] border border-dashed p-4 text-center" style={{ borderColor: `${accentColor}44`, background: `${accentColor}14` }}>
        <p className="text-sm text-slate-600">رمز الاستجابة السريعة</p>
        <div className="mx-auto mt-3 flex h-44 w-44 items-center justify-center rounded-2xl bg-white p-2">
          <Image src={qrDataUrl} alt="QR code" width={180} height={180} className="h-full w-full object-contain" loading="lazy" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={copyUrl} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5dcf4] bg-white px-3 py-2 text-xs font-semibold text-slate-700" aria-label="نسخ الرابط" type="button">
            <Link2 className="h-4 w-4" />
            نسخ الرابط
          </button>
          <a href={qrDataUrl} download="hee-qr.png" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5dcf4] bg-white px-3 py-2 text-xs font-semibold text-slate-700" aria-label="تنزيل QR">
            <Download className="h-4 w-4" />
            تنزيل QR
          </a>
        </div>
        <div className="mt-3">
          <PublicShareButton title="HEE" text="شارك صفحة النشاط" url={publicUrl} label="مشاركة" fullWidth className="justify-center border-[#d5dcf4] bg-white text-slate-700" />
        </div>
        {copied ? <p className="mt-2 text-xs text-emerald-700">تم نسخ الرابط</p> : null}
      </div>
    </section>
  );
}
