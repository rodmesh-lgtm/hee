"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, MessageCircle, X } from "lucide-react";
import { PublicActionDialog } from "./public-action-dialog";

type Service = {
  id: string;
  name: string | null;
  bookingEnabled?: boolean | null;
  durationMinutes?: number | null;
};

type Props = {
  slug: string;
  businessName: string;
  whatsapp: string | null;
  phone: string | null;
  bookingAvailable: boolean;
  hasWorkingHours: boolean;
  services: Service[];
};

type BookingValues = { name: string; phone: string; serviceId: string; bookingDate: string; bookingTime: string; notes: string };

function requestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function riyadhToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function PublicTransactionLauncher({ slug, businessName, whatsapp, phone, bookingAvailable, hasWorkingHours, services }: Props) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [values, setValues] = useState<BookingValues>({ name: "", phone: "", serviceId: "", bookingDate: "", bookingTime: "", notes: "" });
  const bookingId = useRef<string | null>(null);
  const bookingDialogRef = useRef<HTMLDivElement | null>(null);
  const firstBookingInputRef = useRef<HTMLInputElement | null>(null);
  const bookingOpenerRef = useRef<HTMLButtonElement | null>(null);
  const submittingRef = useRef(false);
  submittingRef.current = submitting;
  const bookableServices = useMemo(() => services.filter((service) => service.bookingEnabled && service.name), [services]);
  const canBook = bookingAvailable && hasWorkingHours && bookableServices.length > 0;
  const canRequest = Boolean(whatsapp?.trim() || phone?.trim());

  const closeBooking = () => {
    if (submittingRef.current) return;
    setBookingOpen(false);
    setError("");
    setSuccess("");
    bookingId.current = null;
  };

  useEffect(() => {
    if (!bookingOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const timer = window.setTimeout(() => firstBookingInputRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!submittingRef.current) {
          setBookingOpen(false);
          setError("");
          setSuccess("");
          bookingId.current = null;
        }
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = bookingDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      bookingOpenerRef.current?.focus();
    };
  }, [bookingOpen]);

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const phoneDigits = values.phone.replace(/\D/g, "");
    if (!values.name.trim() || phoneDigits.length < 8 || phoneDigits.length > 15 || !values.serviceId || !values.bookingDate || !values.bookingTime) {
      setError("أكمل الاسم والجوال والخدمة والتاريخ والوقت.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const id = bookingId.current ?? requestId();
      bookingId.current = id;
      const response = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": id },
        body: JSON.stringify({ slug, name: values.name.trim(), phone: values.phone.trim(), serviceId: values.serviceId, bookingDate: values.bookingDate, bookingTime: values.bookingTime, notes: values.notes.trim(), requestId: id }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; bookingId?: string } | null;
      if (!response.ok) {
        setError(payload?.error || "تعذر تسجيل الحجز الآن. حاول مرة أخرى.");
        return;
      }
      setSuccess("تم تسجيل الحجز بنجاح وسيظهر مباشرة لدى المنشأة.");
    } catch {
      setError("تعذر الاتصال بالخدمة الآن. حاول مرة أخرى.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!canRequest && !canBook) return null;

  return <>
    <div dir="rtl" className="fixed inset-x-0 bottom-0 z-[120] mx-auto flex w-full max-w-[580px] gap-2 border-t border-[#ece7f1] bg-white/95 p-3 shadow-[0_-14px_32px_rgba(55,35,70,.08)] backdrop-blur" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      {canRequest ? <button onClick={() => setRequestOpen(true)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6f3bd2] px-4 text-sm font-black text-white"><MessageCircle className="h-4 w-4" />طلب خدمة</button> : null}
      {canBook ? <button ref={bookingOpenerRef} onClick={() => setBookingOpen(true)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#dcd5f4] bg-[#f7f4ff] px-4 text-sm font-black text-[#5d49cc]"><CalendarDays className="h-4 w-4" />حجز موعد</button> : null}
    </div>

    {canRequest ? <PublicActionDialog open={requestOpen} onClose={() => setRequestOpen(false)} mode="request" businessName={businessName} whatsapp={whatsapp} phone={phone} title="طلب خدمة" description="سنسجل طلبك داخل HEE ثم نجهز التواصل مع المنشأة." ctaLabel="تسجيل الطلب والمتابعة" /> : null}

    {bookingOpen ? <div dir="rtl" className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 p-3" onClick={closeBooking}>
      <div ref={bookingDialogRef} role="dialog" aria-modal="true" aria-labelledby="hee-booking-title" aria-describedby="hee-booking-description" className="w-full max-w-[520px] overflow-hidden rounded-[24px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-[#eee9f2] p-4"><div><h2 id="hee-booking-title" className="text-lg font-black text-[#20264f]">حجز موعد</h2><p id="hee-booking-description" className="mt-1 text-xs text-slate-500">اختر الخدمة والموعد المناسب، وسيصل الحجز مباشرة للمنشأة.</p></div><button onClick={closeBooking} className="grid h-9 w-9 place-items-center rounded-xl border border-[#ece8f3] text-slate-500" aria-label="إغلاق"><X className="h-4 w-4" /></button></div>
        {success ? <div className="p-5"><div role="status" aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-700">{success}</div><button onClick={closeBooking} className="mt-4 h-11 w-full rounded-xl bg-[#6f3bd2] text-sm font-black text-white">إغلاق</button></div> : <form onSubmit={submitBooking} className="space-y-3 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>الاسم</span><input ref={firstBookingInputRef} autoComplete="name" value={values.name} onChange={(e) => setValues((current) => ({ ...current, name: e.target.value }))} className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>رقم الجوال</span><input dir="ltr" inputMode="tel" autoComplete="tel" value={values.phone} onChange={(e) => setValues((current) => ({ ...current, phone: e.target.value }))} className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /></label></div>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>الخدمة</span><select value={values.serviceId} onChange={(e) => setValues((current) => ({ ...current, serviceId: e.target.value }))} className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]"><option value="">اختر الخدمة</option>{bookableServices.map((service) => <option key={service.id} value={service.id}>{service.name}{service.durationMinutes ? ` · ${service.durationMinutes} دقيقة` : ""}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>التاريخ</span><input type="date" min={riyadhToday()} value={values.bookingDate} onChange={(e) => setValues((current) => ({ ...current, bookingDate: e.target.value }))} className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>الوقت</span><input type="time" value={values.bookingTime} onChange={(e) => setValues((current) => ({ ...current, bookingTime: e.target.value }))} className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /></label></div>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>ملاحظات <small className="font-normal text-slate-400">اختياري</small></span><textarea value={values.notes} onChange={(e) => setValues((current) => ({ ...current, notes: e.target.value }))} className="min-h-[80px] rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 py-2.5 text-sm outline-none focus:border-[#b7a9ef]" /></label>
          {error ? <p role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">{error}</p> : null}
          <button disabled={submitting} className="h-12 w-full rounded-2xl bg-[#6f3bd2] text-sm font-black text-white disabled:opacity-60">{submitting ? "جارٍ تسجيل الحجز..." : "تأكيد الحجز"}</button>
        </form>}
      </div>
    </div> : null}
  </>;
}
