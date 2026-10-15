import Link from "next/link";
import { HISTORY_PAGE_SIZE, historyHref, historyPageLinks } from "../../app/lib/history-navigation";

export function HistoryPagination({ path, filters, page, pages, matching }: {
  path: string; filters: Record<string, string>; page: number; pages: number; matching: number;
}) {
  return <nav aria-label="صفحات السجل" className="infro-history-pagination flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-600">
    <p role="status">{matching ? `${(page - 1) * HISTORY_PAGE_SIZE + 1}–${Math.min(page * HISTORY_PAGE_SIZE, matching)} من ${matching} نتيجة` : "لا توجد نتائج مطابقة"}</p>
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <span className="w-full text-center sm:w-auto">صفحة {page} من {pages}</span>
      {pages > 1 ? <>
        {page > 1 ? <Link prefetch={false} rel="prev" href={historyHref(path, filters, page - 1)} className="infro-history-step">السابق</Link> : <span aria-disabled="true" className="infro-history-step">السابق</span>}
        <div className="flex flex-wrap items-center gap-1" aria-label="أرقام الصفحات">
          {historyPageLinks(page, pages).map((item, index) => item === "gap"
            ? <span key={`gap-${index}`} aria-hidden="true" className="px-1">…</span>
            : item === page
              ? <span key={item} aria-current="page" aria-label={`الصفحة ${item}، الحالية`} className="infro-history-page">{item}</span>
              : <Link key={item} prefetch={false} aria-label={item === 1 ? "الصفحة الأولى" : item === pages ? `الصفحة الأخيرة، ${item}` : `الصفحة ${item}`} href={historyHref(path, filters, item)} className="infro-history-page">{item}</Link>)}
        </div>
        {page < pages ? <Link prefetch={false} rel="next" href={historyHref(path, filters, page + 1)} className="infro-history-step">التالي</Link> : <span aria-disabled="true" className="infro-history-step">التالي</span>}
      </> : null}
    </div>
  </nav>;
}
