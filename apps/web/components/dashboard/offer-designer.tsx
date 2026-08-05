"use client";

import { toPng } from "html-to-image";
import { Download, ImagePlus, Loader2, Sparkles } from "lucide-react";
import type { CSSProperties, ChangeEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { Card } from "../ui/card";

type OfferDesignerProps = {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  phone: string | null;
  whatsapp: string | null;
  publicUrl: string;
};

type OfferTemplate = {
  id: string;
  name: string;
  subtitle: string;
  previewClassName: string;
  ribbonClassName: string;
  panelClassName: string;
};

const TEMPLATES: OfferTemplate[] = [
  {
    id: "pulse",
    name: "نبض",
    subtitle: "طاقة عالية وتباين واضح",
    previewClassName:
      "bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.35),transparent_28%),linear-gradient(150deg,#0f172a_0%,#1e293b_45%,#334155_100%)] text-white",
    ribbonClassName: "bg-amber-300/20 text-amber-100 border border-amber-200/40",
    panelClassName: "border-white/20 bg-black/25",
  },
  {
    id: "oasis",
    name: "واحة",
    subtitle: "نمط ناعم مع عناصر عضوية",
    previewClassName:
      "bg-[radial-gradient(circle_at_78%_10%,rgba(52,211,153,0.45),transparent_35%),radial-gradient(circle_at_20%_88%,rgba(16,185,129,0.28),transparent_42%),linear-gradient(160deg,#022c22_0%,#064e3b_52%,#065f46_100%)] text-white",
    ribbonClassName: "bg-emerald-200/20 text-emerald-100 border border-emerald-200/40",
    panelClassName: "border-emerald-100/25 bg-emerald-950/35",
  },
  {
    id: "paper",
    name: "ورق",
    subtitle: "أنيق ومشرق بطابع إعلاني",
    previewClassName:
      "bg-[linear-gradient(135deg,#fff7ed_0%,#ffedd5_40%,#fde68a_100%)] text-slate-900",
    ribbonClassName: "bg-white/70 text-amber-900 border border-amber-300/70",
    panelClassName: "border-amber-400/35 bg-white/65",
  },
  {
    id: "mono",
    name: "أحادي",
    subtitle: "تصميم جريء بنَفَس حديث",
    previewClassName:
      "bg-[linear-gradient(165deg,#020617_0%,#0f172a_45%,#1e1b4b_100%)] text-white",
    ribbonClassName: "bg-white/10 text-white border border-white/20",
    panelClassName: "border-white/15 bg-white/5",
  },
  {
    id: "sunset",
    name: "غروب",
    subtitle: "ألوان دافئة وعاطفية",
    previewClassName:
      "bg-[radial-gradient(circle_at_8%_10%,rgba(251,191,36,0.55),transparent_34%),radial-gradient(circle_at_80%_85%,rgba(244,63,94,0.55),transparent_34%),linear-gradient(145deg,#7f1d1d_0%,#9a3412_44%,#7c2d12_100%)] text-white",
    ribbonClassName: "bg-rose-200/20 text-rose-50 border border-rose-100/35",
    panelClassName: "border-rose-100/25 bg-black/20",
  },
  {
    id: "skyline",
    name: "سكاي",
    subtitle: "برودة لونية تناسب التقنية",
    previewClassName:
      "bg-[radial-gradient(circle_at_75%_15%,rgba(125,211,252,0.45),transparent_35%),linear-gradient(150deg,#082f49_0%,#0c4a6e_45%,#155e75_100%)] text-white",
    ribbonClassName: "bg-cyan-100/20 text-cyan-50 border border-cyan-100/35",
    panelClassName: "border-cyan-100/25 bg-sky-950/30",
  },
];

function normalizeHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#2563EB";
}

function toArabicCurrency(value: number) {
  return `${value.toFixed(0)} ر.س`;
}

export function OfferDesigner({ businessName, logoUrl, primaryColor, phone, whatsapp, publicUrl }: OfferDesignerProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [title, setTitle] = useState(`عرض خاص من ${businessName}`);
  const [description, setDescription] = useState("لفترة محدودة. اغتنم الفرصة الآن قبل انتهاء العرض.");
  const [price, setPrice] = useState("250");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [offerImageUrl, setOfferImageUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = useMemo(
    () => TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0],
    [templateId],
  );

  const mainColor = normalizeHexColor(primaryColor);
  const basePrice = Number(price) > 0 ? Number(price) : 0;
  const discount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const discountedPrice = basePrice > 0 ? Math.max(0, Math.round(basePrice * (1 - discount / 100))) : 0;
  const contactNumber = whatsapp || phone || "";

  const previewStyle = {
    "--brand-color": mainColor,
  } as CSSProperties;

  function onImagePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("يرجى اختيار ملف صورة صالح.");
      return;
    }

    setError(null);
    const url = URL.createObjectURL(file);
    setOfferImageUrl(url);
  }

  async function downloadDesign() {
    if (!previewRef.current) {
      return;
    }

    try {
      setError(null);
      setExporting(true);
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        canvasWidth: 1080,
        canvasHeight: 1080,
      });

      const anchor = document.createElement("a");
      anchor.download = `offer-${Date.now()}.png`;
      anchor.href = dataUrl;
      anchor.click();
    } catch {
      setError("تعذر تحميل التصميم حالياً. حاول مرة أخرى.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px,minmax(0,1fr)]" dir="rtl">
      <Card className="space-y-5 bg-slate-950/75" hoverLift={false}>
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-wide text-slate-400">1. اختر القالب 2. أدخل العرض 3. معاينة 4. تحميل التصميم</p>
          <h2 className="text-xl font-black text-white">إعدادات العرض</h2>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-200">القالب</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTemplateId(item.id)}
                className={`rounded-2xl border px-3 py-3 text-right transition ${
                  templateId === item.id
                    ? "border-white/40 bg-white/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25"
                }`}
              >
                <p className="text-sm font-black">{item.name}</p>
                <p className="text-xs text-slate-300">{item.subtitle}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-bold text-slate-200" htmlFor="offer-title">عنوان العرض</label>
          <input
            id="offer-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-300"
            placeholder="مثال: خصم نهاية الأسبوع"
          />

          <label className="text-sm font-bold text-slate-200" htmlFor="offer-description">وصف قصير</label>
          <textarea
            id="offer-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-300"
            placeholder="اكتب رسالة العرض"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-200" htmlFor="offer-price">السعر الأساسي</label>
              <input
                id="offer-price"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/[^0-9]/g, ""))}
                className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-300"
                placeholder="250"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-200" htmlFor="offer-discount">نسبة الخصم %</label>
              <input
                id="offer-discount"
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value.replace(/[^0-9]/g, ""))}
                className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-300"
                placeholder="20"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-200" htmlFor="offer-image">صورة المنتج / الخدمة</label>
          <label
            htmlFor="offer-image"
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/5 text-sm font-bold text-slate-200 hover:border-white/45"
          >
            <ImagePlus className="h-4 w-4" />
            اختيار صورة
          </label>
          <input id="offer-image" type="file" accept="image/*" className="hidden" onChange={onImagePick} />
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          <h3 className="text-sm font-black text-white">هوية النشاط (تلقائياً)</h3>
          <p className="text-xs text-slate-300">{businessName}</p>
          <p className="text-xs text-slate-300">اللون الأساسي: {mainColor}</p>
          <p className="text-xs text-slate-300">تواصل: {contactNumber || "أضف رقم اتصال في إعدادات النشاط"}</p>
          <p className="truncate text-xs text-slate-300" dir="ltr">{publicUrl}</p>
        </div>

        <button
          type="button"
          onClick={downloadDesign}
          disabled={exporting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          تحميل التصميم PNG 1080x1080
        </button>

        {error ? <p className="text-xs font-bold text-rose-300">{error}</p> : null}
      </Card>

      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h2 className="text-xl font-black text-white">المعاينة المباشرة</h2>

        <div className="mx-auto w-full max-w-[540px]">
          <div
            ref={previewRef}
            className={`relative aspect-square w-full overflow-hidden rounded-[32px] border border-white/15 p-7 sm:p-10 ${template.previewClassName}`}
            style={previewStyle}
            dir="rtl"
          >
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full opacity-60" style={{ backgroundColor: "var(--brand-color)" }} />
            <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full opacity-50" style={{ backgroundColor: "var(--brand-color)" }} />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt={businessName} className="h-12 w-12 rounded-2xl border border-white/20 bg-white object-cover" />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-base font-black"
                      style={{ color: "var(--brand-color)" }}
                    >
                      {businessName.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-black">{businessName}</p>
                    <p className="text-xs opacity-90">عرض حصري</p>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${template.ribbonClassName}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  لفترة محدودة
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black leading-tight sm:text-4xl">{title || "عنوان العرض"}</h3>
                  <p className="text-sm leading-7 opacity-95 sm:text-base">{description || "أضف وصفاً مختصراً للعرض هنا."}</p>
                </div>

                {offerImageUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/15">
                    <img src={offerImageUrl} alt="offer" className="h-40 w-full object-cover sm:h-48" />
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/30 bg-black/10 text-sm font-bold opacity-90 sm:h-48">
                    أضف صورة المنتج أو الخدمة
                  </div>
                )}

                <div className={`rounded-2xl border p-4 ${template.panelClassName}`}>
                  <div className="flex items-end justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-bold opacity-85">السعر بعد الخصم</p>
                      <p className="text-2xl font-black sm:text-3xl" style={{ color: "var(--brand-color)" }}>
                        {discountedPrice > 0 ? toArabicCurrency(discountedPrice) : "-"}
                      </p>
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold opacity-85">قبل الخصم</p>
                      <p className="text-sm opacity-90 line-through">{basePrice > 0 ? toArabicCurrency(basePrice) : "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 text-xs opacity-95">
                <p>{contactNumber ? `للتواصل: ${contactNumber}` : "أضف رقم التواصل من إعدادات النشاط"}</p>
                <p className="max-w-[45%] truncate text-left" dir="ltr">{publicUrl}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}