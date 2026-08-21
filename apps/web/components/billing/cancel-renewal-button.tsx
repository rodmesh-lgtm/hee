"use client";

export function CancelRenewalButton() {
  return <button
    type="submit"
    onClick={(event) => {
      if (!window.confirm("هل تريد إيقاف التجديد التلقائي؟ ستظل الباقة الحالية فعالة حتى نهاية الفترة المدفوعة.")) {
        event.preventDefault();
      }
    }}
    className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 text-xs font-black text-amber-900"
  >
    إيقاف التجديد التلقائي
  </button>;
}
