"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, FileText, Share2, type LucideIcon } from "lucide-react";
import { FaFacebookF, FaInstagram, FaSnapchat, FaTiktok, FaXTwitter } from "react-icons/fa6";

type SocialLink = { label: string; href: string };
type Props = { companyProfileUrl?: string | null; companyProfileTitle?: string | null; socialLinks: SocialLink[] };

const socialLabel: Record<string, string> = { Instagram: "Instagram", X: "X", TikTok: "TikTok", Snapchat: "Snapchat", Facebook: "Facebook" };
const socialIcon = { Instagram: FaInstagram, X: FaXTwitter, TikTok: FaTiktok, Snapchat: FaSnapchat, Facebook: FaFacebookF };

function HighlightIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e2f8f4] text-[#008f87]"><Icon className="h-[18px] w-[18px]" /></span>;
}

function Highlights({ companyProfileUrl, companyProfileTitle, socialLinks }: Props) {
  return <div data-public-identity-highlights className="grid gap-2.5 sm:grid-cols-2">
    {companyProfileUrl ? <Link href={companyProfileUrl} target="_blank" rel="noreferrer" className="group flex min-h-[82px] items-center gap-3 rounded-[18px] border border-[#e0e8e6] bg-white px-4 py-3.5 transition hover:border-[#9eddd2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d] active:scale-[.99]">
      <HighlightIcon icon={FileText} /><span className="min-w-0 flex-1"><b className="block truncate text-[13px] text-[#102527]">{companyProfileTitle || "الملف التعريفي للشركة"}</b><span className="mt-1 block text-[10px] text-[#718583]">عرض الملف الرسمي للمنشأة</span></span><span className="shrink-0 rounded-xl bg-[#073437] px-3 py-2 text-[10px] font-black text-[#69efd8]">فتح</span>
    </Link> : null}
    {socialLinks.length ? <div className="min-h-[82px] rounded-[18px] border border-[#e0e8e6] bg-white px-4 py-3.5">
      <div className="flex items-center gap-3"><HighlightIcon icon={socialLinks.length > 0 ? Share2 : BadgeCheck} /><div className="min-w-0"><b className="block text-[13px] text-[#102527]">حساباتنا الرسمية</b><span className="mt-1 block text-[10px] text-[#718583]">تابع المنشأة عبر منصاتها المعتمدة</span></div></div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">{socialLinks.slice(0,5).map(({ label, href }) => {const SocialIcon=socialIcon[label as keyof typeof socialIcon]??Share2;return <Link key={`${label}-${href}`} href={href} target="_blank" rel="noreferrer" aria-label={`حساب المنشأة على ${socialLabel[label] || label}`} title={socialLabel[label] || label} className="grid min-h-11 place-items-center rounded-xl border border-[#cfe4df] bg-[#f3f8f7] text-[#087b75] transition hover:-translate-y-0.5 hover:border-[#83d9ca] hover:bg-[#e8f8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d] motion-reduce:transition-none"><SocialIcon className="h-4 w-4" aria-hidden="true"/></Link>})}</div>
    </div> : null}
  </div>;
}

export function PublicIdentityHighlights(props: Props) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const attachMount = useCallback((mount: HTMLDivElement | null) => {
    if (!mount) {
      setTarget(null);
      return;
    }
    const slot = document.querySelector<HTMLElement>("[data-public-highlights-slot]");
    if (slot) slot.append(mount);
    setTarget(mount);
  }, []);

  if (!props.companyProfileUrl && !props.socialLinks.length) return null;
  return <><div ref={attachMount} data-public-identity-mount />{target ? createPortal(<Highlights {...props} />, target) : null}</>;
}
