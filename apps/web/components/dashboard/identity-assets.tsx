"use client";

import { toPng } from "html-to-image";
import { Download, Loader2, Mail, Share2 } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  publicUrl: string;
};

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9\u0600-\u06ff-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "infro-business";
}

function validColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#00bfae";
}

export function IdentityAssets({ businessName, logoUrl, primaryColor, phone, whatsapp, email, website, publicUrl }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const color = validColor(primaryColor);
  const contact = whatsapp || phone;

  async function downloadCard() {
    if (!cardRef.current) return;
    try {
      setCardError(null);
      setExporting(true);
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const anchor = document.createElement("a");
      anchor.download = `${safeFileName(businessName)}-digital-card.png`;
      anchor.href = dataUrl;
      anchor.click();
    } catch {
      setCardError("تعذر إنشاء البطاقة الآن. حاول مرة أخرى.");
    } finally {
      setExporting(false);
    }
  }

  const signature = [businessName, contact, email, website || publicUrl].filter(Boolean).join(" | ");
  async function copySignature() {
    try {
      await navigator.clipboard.writeText(signature);
      setSignatureError(null);
    } catch {
      setSignatureError("تعذر نسخ التوقيع تلقائيًا. يمكنك تحديد النص ونسخه يدويًا.");
    }
  }

  return <section className="grid gap-4 lg:grid-cols-2">
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Share2 className="h-4 w-4" /></span><div><h2 className="font-black text-slate-950">بطاقة الأعمال الرقمية</h2><p className="text-[9px] font-black tracking-[.12em] text-[#008f87]" dir="ltr">INFRO IDENTITY CARD</p></div></div>
      <p className="mt-3 text-xs leading-6 text-slate-500">بطاقة PNG تُنشأ داخل متصفحك من بيانات المنشأة الحالية، بدون إرسال بيانات الهوية إلى خدمة تصميم خارجية.</p>
      <div ref={cardRef} className="relative mt-4 overflow-hidden rounded-[24px] border border-white/10 p-6 text-white shadow-[0_22px_60px_-36px_rgba(7,24,27,.9)]" style={{ background: `linear-gradient(135deg, ${color}, #07181b 72%)` }}>
        <div className="pointer-events-none absolute -left-12 -bottom-16 h-40 w-40 rounded-full bg-[#35e4cb]/20 blur-2xl" />
        <div className="relative flex items-center gap-3">{logoUrl ? <img src={logoUrl} alt="" className="h-14 w-14 rounded-2xl border border-white/15 bg-white object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/10 text-xl font-black">{businessName.slice(0, 1)}</div>}<div><div className="text-lg font-black">{businessName}</div><div className="mt-1 text-[10px] font-bold tracking-[.12em] text-white/70" dir="ltr">DIGITAL IDENTITY · INFRO</div></div></div>
        <div className="relative mt-6 space-y-1 text-xs text-white/85" dir="ltr">{contact ? <div>{contact}</div> : null}{email ? <div>{email}</div> : null}<div className="break-all">{website || publicUrl}</div></div>
      </div>
      <button type="button" onClick={downloadCard} disabled={exporting} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#07181b] px-4 text-xs font-black text-white transition hover:bg-[#0d2a2e] disabled:cursor-not-allowed disabled:opacity-60">{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}تنزيل البطاقة PNG</button>
      {cardError ? <p role="alert" className="mt-3 text-xs font-bold text-rose-700">{cardError}</p> : null}
    </article>

    <article className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Mail className="h-4 w-4" /></span><div><h2 className="font-black text-slate-950">توقيع البريد</h2><p className="text-[9px] font-black tracking-[.12em] text-[#008f87]" dir="ltr">INFRO EMAIL SIGNATURE</p></div></div>
      <p className="mt-3 text-xs leading-6 text-slate-500">توقيع نصي بسيط وآمن يصلح للبريد والدعم والمراسلات الرسمية دون HTML نشط أو تتبع خارجي.</p>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-7 text-slate-800" dir="auto">{signature}</div>
      <button type="button" onClick={copySignature} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#bdebe5] bg-[#effbf9] px-4 text-xs font-black text-[#007d75] transition hover:bg-[#e4f8f5]">نسخ التوقيع</button>
      {signatureError ? <p role="alert" className="mt-3 text-xs font-bold text-rose-700">{signatureError}</p> : null}
    </article>
  </section>;
}