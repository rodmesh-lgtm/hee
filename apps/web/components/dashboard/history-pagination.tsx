import Link from "next/link";
import { HISTORY_PAGE_SIZE, historyHref } from "../../app/lib/history-navigation";

export function HistoryPagination({ path, filters, page, pages, matching }: {
  path: string; filters: Record<string, string>; page: number; pages: number; matching: number;
}) {
  return <nav aria-label="صفحات السجل" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-600">
    <p role="status">{matching ? `${(page - 1) * HISTORY_PAGE_SIZE + 1}–${Math.min(page * HISTORY_PAGE_SIZE, matching)} من ${matching} نتيجة` : "لا توجد نتائج مطابقة"}</p>
    <div className="flex flex-wrap items-center gap-2">
      {page > 1 ? <Link rel="prev" href={historyHref(path, filters, page - 1)} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4">السابق</Link> : null}
      <span>صفحة {page} من {pages}</span>
      {page < pages ? <Link rel="next" href={historyHref(path, filters, page + 1)} className="inline-flex min-h-11 items-center rounded-xl bg-[#07181b] px-4 text-white">التالي</Link> : null}
    </div>
  </nav>;
}
