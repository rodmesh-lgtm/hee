"use client";
import { useI18n } from "../i18n/locale-provider";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { supportContextForPath } from "../../app/lib/support-context";

export function ContextualSupportLink({ pathname }: { pathname: string }) {
 const { t } = useI18n();

  const context = supportContextForPath(pathname);
  if (!context) return null;
  return (
    <Link href={`/dashboard/support?context=${context}`} prefetch={false}
      aria-label={t("طلب مساعدة في هذه الصفحة")}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae]">
      <LifeBuoy className="h-4 w-4" aria-hidden="true" />
      <span className="hidden md:inline">{t("مساعدة")}</span>
    </Link>
  );
}
