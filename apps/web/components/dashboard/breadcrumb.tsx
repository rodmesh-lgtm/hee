import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
            {index > 0 ? <ChevronLeft className="h-4 w-4 text-slate-500 rtl:rotate-180" /> : null}
            {item.href && !isLast ? (
              <Link href={item.href} className="font-semibold text-slate-400 transition hover:text-white">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-semibold text-white" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
