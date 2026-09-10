import Link from "next/link";
import { FileText, Globe2 } from "lucide-react";

type PublicIdentityExtrasProps = {
  companyProfileUrl?: string | null;
  companyProfileTitle?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  tiktokUrl?: string | null;
  snapchatUrl?: string | null;
  facebookUrl?: string | null;
};

function safeSocialUrl(value: string | null | undefined, allowedHosts: string[]) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!/^https?:$/.test(url.protocol) || !allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function PublicIdentityExtras(props: PublicIdentityExtrasProps) {
  const profileUrl = String(props.companyProfileUrl ?? "").trim();
  const socials = [
    ["Instagram", safeSocialUrl(props.instagramUrl, ["instagram.com"])],
    ["X", safeSocialUrl(props.xUrl, ["x.com", "twitter.com"])],
    ["TikTok", safeSocialUrl(props.tiktokUrl, ["tiktok.com"])],
    ["Snapchat", safeSocialUrl(props.snapchatUrl, ["snapchat.com"])],
    ["Facebook", safeSocialUrl(props.facebookUrl, ["facebook.com", "fb.com"])],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  if (!profileUrl && !socials.length) return null;

  return <section aria-label="الهوية الرقمية للمنشأة" className="mx-auto mb-20 w-full max-w-[760px] space-y-2.5 bg-[#f8fbfa] px-3 pb-6 sm:px-7" dir="rtl">
    {profileUrl ? <article id="company-profile-section" className="rounded-[21px] border border-[#d7e6e3] bg-white p-4 shadow-[0_9px_28px_rgba(7,37,39,.045)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e2f8f4] text-[#008f87]"><FileText className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate text-sm font-black text-[#102527]">{String(props.companyProfileTitle ?? "").trim() || "الملف التعريفي للشركة"}</h2><p className="mt-1 text-[10px] text-[#718583]">الملف الرسمي للمنشأة بصيغة PDF</p></div></div>
        <Link data-analytics-event="company_profile_click" href={profileUrl} target="_blank" rel="noreferrer noopener" className="shrink-0 rounded-xl bg-[#073437] px-4 py-2.5 text-xs font-black text-[#69efd8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d]">عرض الملف</Link>
      </div>
    </article> : null}
    {socials.length ? <article className="rounded-[21px] border border-[#d7e6e3] bg-white p-4 shadow-[0_9px_28px_rgba(7,37,39,.045)]"><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-[#008f87]" /><h2 className="text-sm font-black text-[#102527]">حساباتنا الرسمية</h2></div><div className="mt-3 flex flex-wrap gap-2">{socials.map(([label, href]) => <Link key={label} data-analytics-event="social_click" href={href} target="_blank" rel="noreferrer noopener" className="rounded-xl border border-[#cfe4df] bg-[#f3f8f7] px-3 py-2 text-xs font-black text-[#087b75] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a99d]">{label}</Link>)}</div></article> : null}
  </section>;
}
