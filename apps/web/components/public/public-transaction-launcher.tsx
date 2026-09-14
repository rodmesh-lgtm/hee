"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, Clock3, LoaderCircle, MessageCircle, X } from "lucide-react";
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

type BookingValues = {
  name: string;
  phone: string;
  serviceId: string;
  bookingDate: string;
  bookingTime: string;
  notes: string;
};

type AvailabilityDay = {
  date: string;
  dayOfWeek: number;
  available: boolean;
  slots: string[];
};

type AvailabilityPayload = {
  ok?: boolean;
  error?: string;
  timezone?: string;
  durationMinutes?: number;
  days?: AvailabilityDay[];
};

function requestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function dayName(date: string) {
  return new Intl.DateTimeFormat("ar-SA", { weekday: "short", timeZone: "Asia/Riyadh" }).format(new Date(`${date}T12:00:00+03:00`));
}

function compactDate(date: string) {
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", timeZone: "Asia/Riyadh" }).format(new Date(`${date}T12:00:00+03:00`));
}

function displayTime(time: string) {
  return new Intl.DateTimeFormat("ar-SA", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Riyadh" }).format(new Date(`2020-01-01T${time}:00+03:00`));
}

export function PublicTransactionLauncher({ slug, businessName, whatsapp, phone, bookingAvailable, hasWorkingHours, services }: Props) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availabilityState, setAvailabilityState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [values, setValues] = useState<BookingValues>({
    name: "",
    phone: "",
    serviceId: "",
    bookingDate: "",
    bookingTime: "",
    notes: "",
  });
  const bookingId = useRef<string | null>(null);
  const bookingDialogRef = useRef<HTMLDivElement | null>(null);
  const firstBookingInputRef = useRef<HTMLInputElement | null>(null);
  const bookingOpenerRef = useRef<HTMLButtonElement | null>(null);
  const submittingRef = useRef(false);
  const bookableServices = useMemo(
    () => services.filter((service) => service.bookingEnabled && service.name),
    [services],
  );
  const canBook = bookingAvailable && hasWorkingHours && bookableServices.length > 0;
  const canRequest = Boolean(whatsapp?.trim() || phone?.trim());
  const selectedDay = availabilityDays.find((day) => day.date === values.bookingDate) ?? null;

  const attachMount = useCallback((mount: HTMLDivElement | null) => {
    if (!mount) {
      setTarget(null);
      return;
    }
    document.querySelector<HTMLElement>("[data-public-transactions-slot]")?.append(mount);
    setTarget(mount);
  }, []);

  const closeBooking = useCallback(() => {
    if (submittingRef.current) return;
    setBookingOpen(false);
    setError("");
    setSuccess("");
    setAvailabilityError("");
    bookingId.current = null;
  }, []);

  useEffect(() => {
    if (!bookingOpen) return;
    const bookingOpener = bookingOpenerRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const timer = window.setTimeout(() => firstBookingInputRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!submittingRef.current) closeBooking();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = bookingDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
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
      bookingOpener?.focus();
    };
  }, [bookingOpen, closeBooking]);

  useEffect(() => {
    if (!bookingOpen || !values.serviceId) {
      setAvailabilityState("idle");
      setAvailabilityDays([]);
      setAvailabilityError("");
      setDurationMinutes(null);
      return;
    }

    const controller = new AbortController();
    setAvailabilityState("loading");
    setAvailabilityError("");
    setValues((current) => ({ ...current, bookingDate: "", bookingTime: "" }));

    const query = new URLSearchParams({ slug, serviceId: values.serviceId });
    fetch(`/api/public/bookings?${query.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as AvailabilityPayload | null;
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "تعذر تحميل المواعيد");
        const days = payload.days ?? [];
        setAvailabilityDays(days);
        setDurationMinutes(payload.durationMinutes ?? null);
        const firstAvailable = days.find((day) => day.available);
        setValues((current) => ({
          ...current,
          bookingDate: firstAvailable?.date ?? "",
          bookingTime: "",
        }));
        setAvailabilityState("ready");
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setAvailabilityState("error");
        setAvailabilityError(loadError instanceof Error ? loadError.message : "تعذر تحميل المواعيد المتاحة");
      });

    return () => controller.abort();
  }, [availabilityVersion, bookingOpen, slug, values.serviceId]);

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const phoneDigits = values.phone.replace(/\D/g, "");
    if (!values.name.trim() || phoneDigits.length < 8 || phoneDigits.length > 15 || !values.serviceId || !values.bookingDate || !values.bookingTime) {
      setError("أكمل الاسم والجوال والخدمة واختر موعدًا متاحًا.");
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
        body: JSON.stringify({
          slug,
          name: values.name.trim(),
          phone: values.phone.trim(),
          serviceId: values.serviceId,
          bookingDate: values.bookingDate,
          bookingTime: values.bookingTime,
          notes: values.notes.trim(),
          requestId: id,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; bookingId?: string } | null;
      if (!response.ok) {
        setError(payload?.error || "تعذر تسجيل الحجز الآن. حاول مرة أخرى.");
        setValues((current) => ({ ...current, bookingTime: "" }));
        setAvailabilityVersion((current) => current + 1);
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

  const content = <>
    <div dir="rtl" className="relative z-20 mx-auto flex w-full gap-2 rounded-[20px] border border-[#cfe5e1] bg-white p-2.5 shadow-[0_14px_36px_rgba(3,55,58,.12)] sm:w-[calc(100%-5rem)]" aria-label="إجراءات الطلب والحجز">
      {canRequest ? <button onClick={() => setRequestOpen(true)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#00b99f,#00a6bd)] px-4 text-sm font-black text-[#041b1d] shadow-[0_9px_24px_rgba(0,203,178,.2)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79f4df] active:scale-[.99]"><MessageCircle className="h-4 w-4" />طلب خدمة</button> : null}
      {canBook ? <button ref={bookingOpenerRef} onClick={() => setBookingOpen(true)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#d6e9e8] bg-[#eef7f8] px-4 text-sm font-black text-[#12384a] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79f4df] active:scale-[.99]"><CalendarDays className="h-4 w-4 text-[#008f9f]" />حجز موعد</button> : null}
    </div>

    {canRequest ? <PublicActionDialog open={requestOpen} onClose={() => setRequestOpen(false)} mode="request" businessName={businessName} whatsapp={whatsapp} phone={phone} title="طلب خدمة" description="سنسجل طلبك داخل INFRO ثم نجهز التواصل مع المنشأة." ctaLabel="تسجيل الطلب والمتابعة" /> : null}

    {bookingOpen ? <div dir="rtl" className="fixed inset-0 z-[260] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center" style={{ paddingTop: "max(12px, env(safe-area-inset-top))", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }} onClick={closeBooking}>
      <div ref={bookingDialogRef} role="dialog" aria-modal="true" aria-labelledby="infro-booking-title" aria-describedby="infro-booking-description" className="my-auto flex max-h-[calc(100dvh-24px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#dfebe8] bg-[#f7fbfa] p-4">
          <div><span className="text-[9px] font-black tracking-[.16em] text-[#008f87]" dir="ltr">APPOINTMENTS</span><h2 id="infro-booking-title" className="mt-1 text-lg font-black text-[#102527]">حجز موعد</h2><p id="infro-booking-description" className="mt-1 text-xs text-[#667b79]">اختر الخدمة ثم أحد المواعيد المتاحة فعليًا.</p></div>
          <button onClick={closeBooking} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#d7e6e3] bg-white text-[#667b79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d]" aria-label="إغلاق"><X className="h-4 w-4" /></button>
        </div>
        {success ? <div className="overflow-y-auto p-5"><div role="status" aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-700">{success}</div><button onClick={closeBooking} className="mt-4 h-11 w-full rounded-xl bg-[#073437] text-sm font-black text-white">إغلاق</button></div> : <form onSubmit={submitBooking} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>الاسم</span><input ref={firstBookingInputRef} autoComplete="name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-xl border border-[#d7e6e3] bg-[#f8fbfa] px-3 text-sm outline-none focus:border-[#00a99d] focus:ring-2 focus:ring-[#00a99d]/15" /></label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>رقم الجوال</span><input dir="ltr" inputMode="tel" autoComplete="tel" value={values.phone} onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))} className="h-11 rounded-xl border border-[#d7e6e3] bg-[#f8fbfa] px-3 text-sm outline-none focus:border-[#00a99d] focus:ring-2 focus:ring-[#00a99d]/15" /></label>
          </div>

          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            <span>الخدمة</span>
            <select aria-label="الخدمة" value={values.serviceId} onChange={(event) => setValues((current) => ({ ...current, serviceId: event.target.value, bookingDate: "", bookingTime: "" }))} className="h-11 rounded-xl border border-[#d7e6e3] bg-[#f8fbfa] px-3 text-sm outline-none focus:border-[#00a99d] focus:ring-2 focus:ring-[#00a99d]/15">
              <option value="">اختر الخدمة</option>
              {bookableServices.map((service) => <option key={service.id} value={service.id}>{service.name}{service.durationMinutes ? ` · ${service.durationMinutes} دقيقة` : ""}</option>)}
            </select>
          </label>

          {availabilityState === "loading" ? <div role="status" className="flex min-h-24 items-center justify-center gap-2 rounded-2xl border border-[#dce9e6] bg-[#f7fbfa] text-xs font-bold text-[#58726f]"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />جارٍ تحميل المواعيد المتاحة</div> : null}
          {availabilityState === "error" ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800"><p>{availabilityError}</p><button type="button" onClick={() => setAvailabilityVersion((current) => current + 1)} className="mt-2 min-h-10 rounded-xl border border-amber-300 bg-white px-3">إعادة المحاولة</button></div> : null}
          {availabilityState === "ready" ? <>
            <fieldset aria-label="التاريخ" className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3"><legend className="text-xs font-black text-slate-700">اختر اليوم</legend><span className="text-[10px] font-bold text-slate-400">30 يومًا قادمة</span></div>
              <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
                {availabilityDays.map((day) => {
                  const selected = values.bookingDate === day.date;
                  return <button key={day.date} type="button" data-booking-date={day.date} disabled={!day.available} aria-pressed={selected} aria-label={day.available ? `اختيار ${dayName(day.date)} ${compactDate(day.date)}` : `${dayName(day.date)} ${compactDate(day.date)} غير متاح`} onClick={() => setValues((current) => ({ ...current, bookingDate: day.date, bookingTime: "" }))} className={`min-h-[72px] min-w-[82px] snap-start rounded-2xl border px-2 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d] ${selected ? "border-[#009eac] bg-[#e8fbfb] text-[#07545d] shadow-[0_7px_18px_rgba(0,158,172,.12)]" : day.available ? "border-[#d7e6e3] bg-white text-[#244246] hover:border-[#8dd9d3]" : "border-slate-100 bg-slate-50 text-slate-300"}`}>
                    <span className="block text-[10px] font-bold">{dayName(day.date)}</span>
                    <b className="mt-1 block text-[11px]">{compactDate(day.date)}</b>
                    <span className={`mt-1 block text-[8px] font-black ${day.available ? "text-emerald-600" : "text-slate-300"}`}>{day.available ? `${day.slots.length} موعد` : "غير متاح"}</span>
                  </button>;
                })}
              </div>
            </fieldset>

            {selectedDay?.available ? <fieldset aria-label="الوقت">
              <div className="mb-2 flex items-center justify-between gap-3"><legend className="text-xs font-black text-slate-700">اختر الوقت</legend>{durationMinutes ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Clock3 className="h-3 w-3" />مدة الخدمة {durationMinutes} دقيقة</span> : null}</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {selectedDay.slots.map((time) => {
                  const selected = values.bookingTime === time;
                  return <button key={time} type="button" data-booking-time={time} aria-pressed={selected} aria-label={`موعد ${time}`} onClick={() => setValues((current) => ({ ...current, bookingTime: time }))} className={`relative min-h-11 rounded-xl border px-2 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d] ${selected ? "border-[#008f9f] bg-[#073f43] text-white" : "border-[#d7e6e3] bg-[#f8fbfa] text-[#25474a] hover:border-[#8dd9d3]"}`}>
                    {selected ? <Check className="absolute left-1.5 top-1.5 h-3 w-3 text-[#68ead7]" /> : null}{displayTime(time)}
                  </button>;
                })}
              </div>
            </fieldset> : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs font-bold text-slate-400">لا توجد أوقات متاحة في هذا اليوم.</p>}
          </> : null}

          <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>ملاحظات <small className="font-normal text-slate-400">اختياري</small></span><textarea value={values.notes} maxLength={1000} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} className="min-h-[76px] rounded-xl border border-[#d7e6e3] bg-[#f8fbfa] px-3 py-2.5 text-sm outline-none focus:border-[#00a99d] focus:ring-2 focus:ring-[#00a99d]/15" /></label>
          {error ? <p role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">{error}</p> : null}
          <button disabled={submitting || availabilityState !== "ready" || !values.bookingDate || !values.bookingTime} className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#073437,#0b5955)] text-sm font-black text-white shadow-[0_10px_25px_rgba(7,52,55,.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "جارٍ تسجيل الحجز..." : "تأكيد الحجز"}</button>
        </form>}
      </div>
    </div> : null}
  </>;

  return <><div ref={attachMount} data-public-transactions-mount />{target ? createPortal(content, target) : null}</>;
}
