"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Share2 } from "lucide-react";
import { FaFacebookF, FaInstagram, FaSnapchat, FaTiktok, FaXTwitter } from "react-icons/fa6";

type SocialLink = { label: string; href: string };
type Props = { companyProfileUrl?: string | null; companyProfileTitle?: string | null; socialLinks: SocialLink[] };

const socialLabel: Record<string, string> = { Instagram: "Instagram", X: "X", TikTok: "TikTok", Snapchat: "Snapchat", Facebook: "Facebook" };
const socialIcon = { Instagram: FaInstagram, X: FaXTwitter, TikTok: FaTiktok, Snapchat: FaSnapchat, Facebook: FaFacebookF };

function SocialChannels({ socialLinks }: Pick<Props, "socialLinks">) {
  if (!socialLinks.length) return null;
  return <section data-public-identity-highlights aria-label="حسابات المنشأة الرسمية" className="rounded-[18px] border border-[#dbe9ec] bg-white/75 px-3 py-3 shadow-[0_8px_24px_rgba(8,34,54,.05)] backdrop-blur">
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#e9f8f7] text-[#078f91]"><Share2 className="h-[18px] w-[18px]" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><b className="block text-[13px] text-[#102b3b]">حساباتنا الرسمية</b><small className="mt-0.5 block text-[10px] text-[#71858f]">تواصل وتابع آخر أخبار المنشأة</small></span>
      <div className="flex shrink-0 gap-1.5">{socialLinks.slice(0,5).map(({ label, href }) => {const SocialIcon=socialIcon[label as keyof typeof socialIcon]??Share2;return <Link key={`${label}-${href}`} href={href} target="_blank" rel="noreferrer" aria-label={`حساب المنشأة على ${socialLabel[label] || label}`} title={socialLabel[label] || label} className="grid h-10 w-10 place-items-center rounded-full border border-[#cfe4df] bg-white text-[#087b75] transition hover:-translate-y-0.5 hover:border-[#83d9ca] hover:bg-[#e8f8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d] motion-reduce:transition-none"><SocialIcon className="h-4 w-4" aria-hidden="true"/></Link>})}</div>
    </div>
  </section>;
}

function CompanyProfile({ companyProfileUrl, companyProfileTitle }: Omit<Props, "socialLinks">) {
  if (!companyProfileUrl) return null;
  return <section className="overflow-hidden rounded-[18px] border border-[#dce7e5] bg-[#f9fcfb]">
    <Link href={companyProfileUrl} target="_blank" rel="noreferrer" className="group flex min-h-[72px] items-center gap-3 px-4 py-3 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00a99d] active:scale-[.99]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#e7f7f4] text-[#008f87]"><FileText className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1"><b className="block truncate text-[13px] text-[#102527]">{companyProfileTitle || "الملف التعريفي للشركة"}</b><span className="mt-1 block text-[10px] text-[#718583]">المستند الرسمي للمنشأة</span></span>
      <span className="shrink-0 rounded-full border border-[#cce4df] bg-white px-3 py-2 text-[10px] font-black text-[#087b75]">عرض</span>
    </Link>
  </section>;
}

export function PublicIdentityHighlights(props: Props) {
  const [socialTarget, setSocialTarget] = useState<HTMLDivElement | null>(null);
  const [profileTarget, setProfileTarget] = useState<HTMLDivElement | null>(null);
  const attachSocialMount = useCallback((mount: HTMLDivElement | null) => {
    if (!mount) { setSocialTarget(null); return; }
    document.querySelector<HTMLElement>("[data-public-social-slot]")?.append(mount);
    setSocialTarget(mount);
  }, []);
  const attachProfileMount = useCallback((mount: HTMLDivElement | null) => {
    if (!mount) { setProfileTarget(null); return; }
    document.querySelector<HTMLElement>("[data-public-profile-slot]")?.append(mount);
    setProfileTarget(mount);
  }, []);

  if (!props.companyProfileUrl && !props.socialLinks.length) return null;
  return <>
    {props.socialLinks.length ? <div ref={attachSocialMount} data-public-social-mount /> : null}
    {props.companyProfileUrl ? <div ref={attachProfileMount} data-public-profile-mount /> : null}
    {socialTarget ? createPortal(<SocialChannels socialLinks={props.socialLinks} />, socialTarget) : null}
    {profileTarget ? createPortal(<CompanyProfile companyProfileUrl={props.companyProfileUrl} companyProfileTitle={props.companyProfileTitle} />, profileTarget) : null}
  </>;
}
