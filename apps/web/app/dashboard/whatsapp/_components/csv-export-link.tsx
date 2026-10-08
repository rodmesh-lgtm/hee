"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import { Download } from "lucide-react";

export function CsvExportLink({ href, filename, label = "تصدير النتائج CSV", className = "wa-button wa-secondary", largeReportHint = "النتائج كبيرة. ضيّق البحث أو الفترة ثم أعد التصدير." }: {
  href: string; filename: string; label?: string; className?: string; largeReportHint?: string;
}) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const noticeId = useId();

  async function download(event: MouseEvent<HTMLAnchorElement>) {
    // Keep native link behavior for modified clicks and when JavaScript is unavailable.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setNotice("");
    try {
      const response = await fetch(href, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const messages: Record<number, string> = {
          401: "انتهت جلسة الدخول. سجّل الدخول مجددًا ثم أعد المحاولة.",
          403: "التصدير يتطلب صلاحية إدارة الحملات واشتراكًا نشطًا.",
          404: "لم يعد التقرير متاحًا. حدّث الصفحة ثم أعد المحاولة.",
          413: largeReportHint,
          429: "وصلت إلى حد طلبات التصدير المؤقت. انتظر ثم أعد المحاولة.",
        };
        setNotice(messages[response.status] ?? "تعذر تجهيز التقرير الآن. أعد المحاولة بعد قليل.");
        return;
      }
      if (!response.headers.get("content-type")?.toLowerCase().startsWith("text/csv")) {
        setNotice("لم يُرجع الخادم ملف التقرير. حدّث الصفحة وتحقق من تسجيل الدخول.");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("تم تجهيز الملف وبدء تنزيله.");
    } catch {
      setNotice("تعذر تنزيل التقرير. تحقق من اتصالك ثم أعد المحاولة.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return <div className="wa-export-control">
    <a href={href} onClick={download} className={className} aria-disabled={pending || undefined} aria-busy={pending} aria-describedby={notice ? noticeId : undefined}>
      <Download size={17} aria-hidden="true"/>{pending ? "جارٍ تجهيز الملف…" : label}
    </a>
    <p id={noticeId} role="status" aria-live="polite" className="wa-export-notice">{notice}</p>
  </div>;
}
