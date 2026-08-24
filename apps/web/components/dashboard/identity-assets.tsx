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
  return value.replace(/[^a-z0-9\u0600-\u06ff-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "hee-business";
}

function validColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#6f3bd2";
}

export function IdentityAssets({ businessName, logoUrl, primaryColor, phone, whatsapp, email, website, publicUrl }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const color = validColor(primaryColor);
  const contact = whatsapp || phone;

  async function downloadCard() {
    if (!cardRef.current) return;
    try {
      setError(null);
      setExporting(true);
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const anchor = document.createElement("a");
      anchor.download = `${safeFileName(businessName)}-digital-card.png`;
      anchor.href = dataUrl;
      anchor.click();
    } catch {
      setError("تعذر إنشاء البطاقة الآن. حاول مرة أخرى.");
    } finally {
      setExporting(false);
    }
  }

  const signature = [businessName, contact, email, website || publicUrl].filter(Boolean).join(" | ");
  async function copySignature() {
    try {
      await navigator.clipboard.writeText(signature);
      setError(null);
    } catch {
      setError("تعذر نسخ التوقيع تلقائيًا. يمكنك تحديد النص ونسخه يدويًا.");
    }
  }

  return <section className="grid gap-4 lg:grid-cols-2">
    <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><Share2 className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">بطاقة الأعمال الرقمية</h2></div>
      <p className="mt-2 text-xs leading-6 text-slate-500">بطاقة PNG تُنشأ داخل متصفحك من بيانات المنشأة الحالية، بدون إرسال بيانات الهوية إلى خدمة تصميم خارجية.</p>
      <div ref={cardRef} className="mt-4 overflow-hidden rounded-[24px] p-6 text-white" style={{ background: `linear-gradient(135deg, ${color}, #20264f)` }}>
        <div className="flex items-center gap-3">{logoUrl ? <img src={logoUrl} alt="" className="h-14 w-14 rounded-2xl bg-white object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-xl font-black">{businessName.slice(0, 1)}</div>}<div><div className="text-lg font-black">{businessName}</div><div className="mt-1 text-xs text-white/75">الهوية الرقمية على HEE</div></div></div>
        <div className="mt-6 space-y-1 text-xs" dir="ltr">{contact ? <div>{contact}</div> : null}{email ? <div>{email}</div> : null}<div className="break-all">{website || publicUrl}</div></div>
      </div>
      <button type="button" onClick={downloadCard} disabled={exporting} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white disabled:opacity-60">{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}تنزيل البطاقة PNG</button>
    </article>

    <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">توقيع البريد</h2></div>
      <p className="mt-2 text-xs leading-6 text-slate-500">توقيع نصي بسيط وآمن يصلح للبريد والدعم والمراسلات الرسمية دون HTML نشط أو تتبع خارجي.</p>
      <div className="mt-4 rounded-2xl border border-[#e7e9f4] bg-[#fbfcff] p-4 text-sm leading-7 text-[#20264f]" dir="auto">{signature}</div>
      <button type="button" onClick={copySignature} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#ddd8f4] bg-white px-4 text-xs font-black text-[#5d49cc]">نسخ التوقيع</button>
      {error ? <p role="alert" className="mt-3 text-xs font-bold text-rose-700">{error}</p> : null}
    </article>
  </section>;
}
