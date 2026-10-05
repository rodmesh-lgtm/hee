export const recipientStatusLabels: Record<string, string> = {
  snapshotted: "لم تدخل الطابور", queued: "في الطابور", processing: "تجري معالجتها",
  sent: "قبلتها Meta", delivered: "تم التسليم", read: "تمت القراءة", failed: "تعذر التسليم",
  skipped_opt_out: "مستبعدون", delivery_unknown: "نتيجة غير مؤكدة",
};

// Mutually exclusive recipient states, unlike cumulative delivery/reading KPIs.
export function campaignAnalytics(total: number, counts: Record<string, number>, acceptedHistory?: number) {
  const count = (key: string) => Math.max(0, counts[key] ?? 0);
  const recorded = Object.values(counts).reduce((sum, value) => sum + Math.max(0, value), 0);
  const other = Object.entries(counts).filter(([key]) => !["snapshotted", "queued", "processing", "sent", "delivered", "read", "failed", "skipped_opt_out"].includes(key)).reduce((sum, [, value]) => sum + Math.max(0, value), 0);
  const read = count("read"), delivered = count("delivered") + read;
  return {
    total, recorded, read, delivered, accepted: Math.max(acceptedHistory ?? 0, count("sent") + delivered), failed: count("failed"),
    mismatch: recorded !== total,
    distribution: [
      { label: "تمت القراءة", value: read, color: "#0891b2" },
      { label: "وصلت ولم تُقرأ", value: count("delivered"), color: "#0d9488" },
      { label: "بانتظار إيصال التسليم", value: count("sent"), color: "#6366f1" },
      { label: "قيد التجهيز والإرسال", value: count("snapshotted") + count("queued") + count("processing"), color: "#d97706" },
      { label: "تعذر التسليم", value: count("failed"), color: "#e11d48" },
      { label: "مستبعدون", value: count("skipped_opt_out"), color: "#64748b" },
      { label: "غير مؤكدة أو غير مصنفة", value: other + Math.max(0, total - recorded), color: "#a855f7" },
    ],
  };
}

export function reportPageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 10000) : 1;
}
