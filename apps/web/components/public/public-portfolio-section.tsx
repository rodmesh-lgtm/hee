import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import type { PortfolioItem } from "../../app/lib/page-modules";

type PublicPortfolioSectionProps = {
  items: PortfolioItem[];
  title?: string;
  darkMode?: boolean;
};

function visibleItems(items: PortfolioItem[]) {
  return items
    .filter((item) => item.visible !== false && item.title?.trim())
    .slice(0, 6)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
}

export function PublicPortfolioSection({ items, title = "أعمالنا", darkMode = false }: PublicPortfolioSectionProps) {
  const list = visibleItems(items);
  if (list.length === 0) {
    return null;
  }

  return (
    <section id="portfolio-section" className={`space-y-3 p-4 ${darkMode ? "rounded-[24px] border border-white/10 bg-slate-950/70" : "rounded-[18px] border border-[#e8ebf7] bg-white"}`}>
      <div className="flex items-center gap-2">
        <BriefcaseBusiness className={`h-5 w-5 ${darkMode ? "text-emerald-300" : "text-[#006C35]"}`} />
        <h2 className={`text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((item) => (
          <article key={item.id} className={`overflow-hidden rounded-2xl border ${darkMode ? "border-white/10 bg-white/5" : "border-[#e8ebf7] bg-[#fbfcff]"}`}>
            <div className={`relative h-28 w-full sm:h-32 ${darkMode ? "bg-[#0f1830]" : "bg-[#eef3ff]"}`}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>لا توجد صورة</div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <h3 className={`line-clamp-2 text-sm font-black leading-6 ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{item.title}</h3>
              {item.description ? <p className={`line-clamp-2 text-xs leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{item.description}</p> : null}
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer noopener" className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${darkMode ? "border border-white/15 text-slate-100" : "border border-[#dbe2f7] text-[#354086]"}`}>
                  {item.ctaLabel?.trim() || "عرض العمل"}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
