"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, FileText, Instagram, type LucideIcon } from "lucide-react";

type SocialLink = { label: string; href: string };
type Props = { companyProfileUrl?: string | null; companyProfileTitle?: string | null; socialLinks: SocialLink[] };

const socialLabel: Record<string, string> = { Instagram: "Instagram", X: "X", TikTok: "TikTok", Snapchat: "Snapchat", Facebook: "Facebook" };

function HighlightIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#f4eefc] text-[#6f3bd2]"><Icon className="h-[18px] w-[18px]" /></span>;
}

function Highlights({ companyProfileUrl, companyProfileTitle, socialLinks }: Props) {
  return <div data-public-identity-highlights className="mb-2 grid gap-2 sm:grid-cols-2">
    {companyProfileUrl ? <Link href={companyProfileUrl} target="_blank" rel="noreferrer" className="group flex min-h-[72px] items-center gap-3 rounded-[18px] border border-[#e8e1ef] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_100%)] px-3.5 py-3 shadow-[0_8px_24px_rgba(55,35,70,.04)] transition active:scale-[.99]">
      <HighlightIcon icon={FileText} /><span className="min-w-0 flex-1"><b className="block truncate text-[13px] text-[#302638]">{companyProfileTitle || "الملف التعريفي للشركة"}</b><span className="mt-1 block text-[10px] text-[#786f7d]">عرض الملف الرسمي للمنشأة</span></span><span className="shrink-0 rounded-xl bg-[#6f3bd2] px-3 py-2 text-[10px] font-black text-white">فتح</span>
    </Link> : null}
    {socialLinks.length ? <div className="min-h-[72px] rounded-[18px] border border-[#e8e1ef] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_100%)] px-3.5 py-3 shadow-[0_8px_24px_rgba(55,35,70,.04)]">
      <div className="flex items-center gap-3"><HighlightIcon icon={socialLinks.some((item) => item.label === "Instagram") ? Instagram : BadgeCheck} /><div className="min-w-0"><b className="block text-[13px] text-[#302638]">حساباتنا الرسمية</b><span className="mt-1 block text-[10px] text-[#786f7d]">تابع المنشأة عبر منصاتها المعتمدة</span></div></div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">{socialLinks.map(({ label, href }) => <Link key={`${label}-${href}`} href={href} target="_blank" rel="noreferrer" aria-label={`حساب المنشأة على ${socialLabel[label] || label}`} className="rounded-xl border border-[#e5dcef] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#5d49cc] transition hover:bg-[#f7f2fc]">{socialLabel[label] || label}</Link>)}</div>
    </div> : null}
  </div>;
}

export function PublicIdentityHighlights(props: Props) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!props.companyProfileUrl && !props.socialLinks.length) return;
    const main = document.querySelector<HTMLElement>("main[dir='rtl']");
    if (!main) return;
    const details = Array.from(main.querySelectorAll<HTMLElement>("section")).find((section) => {
      const firstButton = section.querySelector(":scope > button");
      const text = firstButton?.textContent || "";
      return text.includes("عن المنشأة") || text.includes("خدماتنا");
    });
    if (!details) return;
    const mount = document.createElement("div");
    mount.dataset.publicIdentityMount = "true";
    details.prepend(mount);
    setTarget(mount);
    return () => { setTarget(null); mount.remove(); };
  }, [props.companyProfileUrl, props.socialLinks]);

  if (!target || (!props.companyProfileUrl && !props.socialLinks.length)) return null;
  return createPortal(<Highlights {...props} />, target);
}
