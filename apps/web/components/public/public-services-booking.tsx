"use client";

import { useState } from "react";
import type { PublicService } from "./types";

type BookingFormState = {
  serviceId: string;
  bookingDate: string;
  bookingTime: string;
  employee: string;
  customerName: string;
  customerPhone: string;
  notes: string;
};

type PublicServicesBookingProps = {
  businessSlug: string;
  services: PublicService[];
  bookingEnabled: boolean;
};

function formatPrice(value: number) {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export function PublicServicesBooking({ businessSlug, services, bookingEnabled }: PublicServicesBookingProps) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState<BookingFormState>({
    serviceId: services[0]?.id ?? "",
    bookingDate: "",
    bookingTime: "",
    employee: "",
    customerName: "",
    customerPhone: "",
    notes: "",
  });

  if (services.length === 0) {
    return null;
  }

  const submitBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bookingEnabled) {
      setFeedback({ type: "error", message: "الحجوزات غير مفعلة حالياً" });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: businessSlug,
          serviceId: form.serviceId,
          bookingDate: form.bookingDate,
          bookingTime: form.bookingTime,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          notes: [form.employee ? `الموظف المطلوب: ${form.employee}` : "", form.notes].filter(Boolean).join("\n"),
        }),
      });

      const data = (await response.json()) as { success?: boolean; bookingId?: string; error?: string };
      if (!response.ok) {
        setFeedback({ type: "error", message: data.error ?? "تعذر إنشاء الحجز" });
        return;
      }

      setFeedback({ type: "success", message: `تم إنشاء الحجز بنجاح، رقم الحجز ${data.bookingId}` });
      setForm({
        serviceId: services[0]?.id ?? "",
        bookingDate: "",
        bookingTime: "",
        employee: "",
        customerName: "",
        customerPhone: "",
        notes: "",
      });
    } catch {
      setFeedback({ type: "error", message: "تعذر إنشاء الحجز" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
      <h2 className="mb-4 text-xl font-black">الخدمات</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => setForm((current) => ({ ...current, serviceId: service.id }))}
            className={`rounded-2xl border px-4 py-3 text-right ${form.serviceId === service.id ? "border-indigo-400/60 bg-indigo-500/20" : "border-white/10 bg-white/5"}`}
          >
            <p className="font-bold">{service.name}</p>
            <p className="mt-1 text-xs text-slate-400">{service.description}</p>
            <p className="mt-2 text-sm font-semibold text-indigo-200">{formatPrice(service.price)}</p>
          </button>
        ))}
      </div>

      {!bookingEnabled ? (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">الحجوزات غير مفعلة حالياً لدى النشاط.</div>
      ) : null}

      <form onSubmit={submitBooking} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input type="date" value={form.bookingDate} onChange={(event) => setForm((current) => ({ ...current, bookingDate: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" required />
          <input type="time" value={form.bookingTime} onChange={(event) => setForm((current) => ({ ...current, bookingTime: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" required />
        </div>
        <input value={form.employee} onChange={(event) => setForm((current) => ({ ...current, employee: event.target.value }))} placeholder="الموظف (اختياري)" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" />
        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="الاسم" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" required />
          <input value={form.customerPhone} onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} placeholder="الهاتف" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" required />
        </div>
        <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات" className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" />
        <button type="submit" disabled={submitting || !bookingEnabled} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "جاري الإرسال..." : "تأكيد الحجز"}
        </button>
      </form>

      {feedback ? <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>{feedback.message}</div> : null}
    </section>
  );
}
