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
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#e7f7f4] text-[#008f87]"><Icon className="h-[18px] w-[18px]" /></span>;
}

function Highlights({ companyProfileUrl, companyProfileTitle, socialLinks }: Props) {
  return <div data-public-identity-highlights className="grid overflow-hidden rounded-[18px] border border-[#dce7e5] bg-[#f9fcfb] sm:grid-cols-2 sm:divide-x sm:divide-x-reverse sm:divide-[#dce7e5]">
    {companyProfileUrl ? <Link href={companyProfileUrl} target="_blank" rel="noreferrer" className="group flex min-h-[86px] items-center gap-3 px-4 py-3.5 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00a99d] active:scale-[.99]">
      <HighlightIcon icon={FileText} /><span className="min-w-0 flex-1"><b className="block truncate text-[13px] text-[#102527]">{companyProfileTitle || "الملف التعريفي للشركة"}</b><span className="mt-1 block text-[10px] text-[#718583]">المستند الرسمي للمنشأة</span></span><span className="shrink-0 rounded-full border border-[#cce4df] bg-white px-3 py-2 text-[10px] font-black text-[#087b75]">عرض</span>
    </Link> : null}
    {socialLinks.length ? <div className="flex min-h-[86px] flex-wrap items-center gap-3 border-t border-[#dce7e5] px-4 py-3.5 sm:flex-nowrap sm:border-t-0">
      <HighlightIcon icon={socialLinks.length > 0 ? Share2 : BadgeCheck} /><div className="min-w-0 flex-1"><b className="block text-[13px] text-[#102527]">حساباتنا الرسمية</b><span className="mt-1 block text-[10px] text-[#718583]">قنوات المنشأة المعتمدة</span></div>
      <div className="flex w-full shrink-0 justify-end gap-1.5 sm:w-auto">{socialLinks.slice(0,5).map(({ label, href }) => {const SocialIcon=socialIcon[label as keyof typeof socialIcon]??Share2;return <Link key={`${label}-${href}`} href={href} target="_blank" rel="noreferrer" aria-label={`حساب المنشأة على ${socialLabel[label] || label}`} title={socialLabel[label] || label} className="grid h-10 w-10 place-items-center rounded-full border border-[#cfe4df] bg-white text-[#087b75] transition hover:-translate-y-0.5 hover:border-[#83d9ca] hover:bg-[#e8f8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d] motion-reduce:transition-none"><SocialIcon className="h-4 w-4" aria-hidden="true"/></Link>})}</div>
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
