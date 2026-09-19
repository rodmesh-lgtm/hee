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
  return <section data-public-identity-highlights aria-label="حسابات المنشأة الرسمية" className="rounded-[16px] border border-[#dbe9ec] bg-white/78 px-3 py-2.5 shadow-[0_8px_24px_rgba(8,34,54,.05)] backdrop-blur">
    <div className="flex flex-wrap items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[#e9f8f7] text-[#078f91]"><Share2 className="h-[18px] w-[18px]" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><b className="block text-[14px] text-[#102b3b]">حساباتنا الرسمية</b><small className="mt-0.5 block text-[12px] text-[#71858f]">القنوات المعتمدة للمنشأة</small></span>
      <div className="flex shrink-0 gap-1.5">{socialLinks.slice(0,5).map(({ label, href }) => {const SocialIcon=socialIcon[label as keyof typeof socialIcon]??Share2;return <Link key={`${label}-${href}`} href={href} target="_blank" rel="noreferrer" aria-label={`حساب المنشأة على ${socialLabel[label] || label}`} title={socialLabel[label] || label} className="grid h-9 w-9 place-items-center rounded-full border border-[#cfe4df] bg-white text-[#087b75] transition hover:-translate-y-0.5 hover:border-[#83d9ca] hover:bg-[#e8f8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d] motion-reduce:transition-none"><SocialIcon className="h-4 w-4" aria-hidden="true"/></Link>})}</div>
    </div>
  </section>;
}

function CompanyProfile({ companyProfileUrl, companyProfileTitle }: Omit<Props, "socialLinks">) {
  if (!companyProfileUrl) return null;
  return <section aria-label="الملف التعريفي الرسمي" className="overflow-hidden rounded-[20px] border border-[#bfe9ee] bg-[linear-gradient(135deg,#f3fdff,#ffffff_58%,#f1fbf9)] shadow-[0_12px_30px_rgba(0,142,164,.09)]">
    <Link href={companyProfileUrl} target="_blank" rel="noreferrer" className="group flex min-h-[76px] items-center gap-3 px-3.5 py-3 transition hover:border-cyan-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00a99d] active:scale-[.99]">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-[linear-gradient(135deg,#0878e8,#00bfc7)] text-white shadow-[0_8px_20px_rgba(0,145,208,.2)]"><FileText className="h-5 w-5" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><small className="block text-[12px] font-black text-[#008da4]">الملف التعريفي الرسمي</small><b className="mt-0.5 block truncate text-[15px] text-[#102b3b]">{companyProfileTitle || "ملف المنشأة"}</b><span className="mt-0.5 block text-[12px] text-[#71858f]">نبذة المنشأة وخدماتها ومعلوماتها المعتمدة</span></span>
      <span className="shrink-0 rounded-[12px] border border-[#c9e7e5] bg-white px-3 py-2 text-[12px] font-black text-[#087b75] shadow-sm transition group-hover:border-[#7fd5d0]">فتح الملف</span>
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
