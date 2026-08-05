"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Phone, X } from "lucide-react";

export type PublicActionDialogMode = "request" | "inquiry";

type PublicActionDialogProps = {
  open: boolean;
  onClose: () => void;
  mode: PublicActionDialogMode;
  businessName: string;
  whatsapp: string | null;
  phone: string | null;
  title?: string;
  description?: string;
  triggerLabel?: string;
  ctaLabel?: string;
};

type PublicActionDialogFormState = {
  name?: string;
  phone?: string;
  service?: string;
  notes?: string;
  message?: string;
};

type PublicActionDialogFormErrors = Partial<Record<keyof PublicActionDialogFormState, string>>;

export function normalizeWhatsAppNumber(value: string | null | undefined) {
  if (!value) return null;

  const digits = value.replace(/\D/g, "").trim();
  if (!digits) return null;

  if (digits.startsWith("966")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `966${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith("5")) {
    return `966${digits}`;
  }

  return digits;
}

function buildMessage({
  mode,
  businessName,
  values,
}: {
  mode: PublicActionDialogMode;
  businessName: string;
  values: PublicActionDialogFormState;
}) {
  if (mode === "request") {
    return [
      `مرحبًا ${businessName}،`,
      "أرغب في طلب/حجز خدمة.",
      "",
      `الاسم: ${values.name?.trim() || "-"}`,
      `رقم التواصل: ${values.phone?.trim() || "-"}`,
      `الخدمة المطلوبة: ${values.service?.trim() || "-"}`,
      `الملاحظات: ${values.notes?.trim() || "-"}`,
    ].join("\n");
  }

  return [
    `مرحبًا ${businessName}،`,
    "لدي الاستفسار التالي:",
    "",
    `الاسم: ${values.name?.trim() || "-"}`,
    `الاستفسار: ${values.message?.trim() || "-"}`,
  ].join("\n");
}

export function buildRequestWhatsAppUrl({
  businessName,
  whatsapp,
  values,
}: {
  businessName: string;
  whatsapp: string | null;
  values: PublicActionDialogFormState;
}) {
  const normalized = normalizeWhatsAppNumber(whatsapp);
  if (!normalized) return null;

  const message = buildMessage({ mode: "request", businessName, values });
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildInquiryWhatsAppUrl({
  businessName,
  whatsapp,
  values,
}: {
  businessName: string;
  whatsapp: string | null;
  values: PublicActionDialogFormState;
}) {
  const normalized = normalizeWhatsAppNumber(whatsapp);
  if (!normalized) return null;

  const message = buildMessage({ mode: "inquiry", businessName, values });
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function PublicActionDialog({
  open,
  onClose,
  mode,
  businessName,
  whatsapp,
  phone,
  title,
  description,
  triggerLabel,
  ctaLabel,
}: PublicActionDialogProps) {
  const [values, setValues] = useState<PublicActionDialogFormState>({});
  const [errors, setErrors] = useState<PublicActionDialogFormErrors>({});
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const firstTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const normalizedWhatsApp = useMemo(() => normalizeWhatsAppNumber(whatsapp), [whatsapp]);
  const fallbackPhoneHref = useMemo(() => {
    if (!phone) return null;
    const cleaned = phone.replace(/[^\d+]/g, "").trim();
    return cleaned ? `tel:${cleaned}` : null;
  }, [phone]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const timer = window.setTimeout(() => {
      firstInputRef.current?.focus();
      firstTextareaRef.current?.focus();
      closeButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open, onClose]);

  const setValue = (field: keyof PublicActionDialogFormState, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: PublicActionDialogFormErrors = {};

    if (mode === "request") {
      if (!values.name?.trim()) nextErrors.name = "الاسم مطلوب";
      if (!values.phone?.trim()) nextErrors.phone = "رقم الجوال مطلوب";
      if (!values.service?.trim()) nextErrors.service = "الخدمة المطلوبة مطلوبة";
    }

    if (mode === "inquiry" && !values.message?.trim()) {
      nextErrors.message = "الاستفسار مطلوب";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const url = mode === "request"
      ? buildRequestWhatsAppUrl({ businessName, whatsapp, values })
      : buildInquiryWhatsAppUrl({ businessName, whatsapp, values });

    if (!url) {
      if (fallbackPhoneHref) {
        window.location.assign(fallbackPhoneHref);
      }
      return;
    }

    window.location.href = url;
  };

  if (!open || !mounted) return null;

  const dialogContent = (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-[min(100dvh-24px,560px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-slate-950 text-white shadow-2xl"
        style={{ maxHeight: "calc(100dvh - 24px)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 py-4 sm:px-5">
          <div>
            <h3 id={titleId} className="text-lg font-black">{title ?? (mode === "request" ? "طلب / حجز" : "استفسار")}</h3>
            <p className="mt-1 text-xs leading-6 text-slate-300">{description ?? (mode === "request" ? "أرسل تفاصيل الطلب وسيتم تجهيز الرسالة عبر واتساب." : "أرسل استفسارك وسيتم فتح واتساب مباشرة.")}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="rounded-xl border border-white/15 p-2 text-slate-200" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {mode === "request" ? (
              <div className="space-y-3">
                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span>الاسم</span>
                  <input ref={firstInputRef} value={values.name ?? ""} onChange={(event) => setValue("name", event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-400" placeholder="الاسم" />
                  {errors.name ? <span className="text-[11px] text-rose-300">{errors.name}</span> : null}
                </label>
                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span>رقم الجوال</span>
                  <input value={values.phone ?? ""} onChange={(event) => setValue("phone", event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-400" placeholder="05xxxxxxxx" dir="ltr" />
                  {errors.phone ? <span className="text-[11px] text-rose-300">{errors.phone}</span> : null}
                </label>
                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span>الخدمة المطلوبة</span>
                  <input value={values.service ?? ""} onChange={(event) => setValue("service", event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-400" placeholder="مثال: حجز طاولة" />
                  {errors.service ? <span className="text-[11px] text-rose-300">{errors.service}</span> : null}
                </label>
                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span>ملاحظات</span>
                  <textarea value={values.notes ?? ""} onChange={(event) => setValue("notes", event.target.value)} className="min-h-[84px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400" placeholder="أضف ملاحظاتك هنا" />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span>الاسم (اختياري)</span>
                  <input value={values.name ?? ""} onChange={(event) => setValue("name", event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-400" placeholder="الاسم" />
                </label>
                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span>الاستفسار</span>
                  <textarea ref={firstTextareaRef} value={values.message ?? ""} onChange={(event) => setValue("message", event.target.value)} className="min-h-[84px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400" placeholder="اكتب استفسارك هنا" />
                  {errors.message ? <span className="text-[11px] text-rose-300">{errors.message}</span> : null}
                </label>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-slate-950 px-4 py-3.5 sm:px-5" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm font-black text-white">
              {normalizedWhatsApp ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              {ctaLabel ?? (mode === "request" ? "إرسال عبر واتساب" : "إرسال الاستفسار عبر واتساب")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
