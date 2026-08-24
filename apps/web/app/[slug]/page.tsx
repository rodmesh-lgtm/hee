import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getBusinessPublic } from "../lib/public-business";
import { PublicBusinessPageV10Light } from "../../components/public-business-page-v10-light";
import { PublicBusinessAnalytics } from "../../components/public-business-analytics";
import { PublicTransactionLauncher } from "../../components/public/public-transaction-launcher";
import { getPublicBusinessUrlFromRequest, isValidPublicSlug, normalizePublicSlug } from "../lib/public-url";
import { sanitizePublicBusiness } from "../lib/public-business-sanitize";
import { isPreviewQaEnvironment } from "../lib/qa-audit";
import { resolveBusinessSlugAlias } from "../lib/slug-alias";

export const dynamic = "force-dynamic";
const getPublicBusinessForRequest = cache((slug: string) => getBusinessPublic(slug));
function makeQrUrl(url: string) { return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`; }
function safeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
function absolutePublicAssetUrl(value?: string | null) { const raw = String(value ?? "").trim(); if (!raw) return null; if (/^https?:\/\//i.test(raw)) return raw; if (raw.startsWith("/")) return `https://hee.sa${raw}`; if (/^[\w@./-]+\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(raw)) return `https://hee.sa/${raw.replace(/^\/+/, "")}`; return null; }
function safeExternalUrl(value?: string | null) { const raw = String(value ?? "").trim(); if (!raw) return null; try { const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); return /^https?:$/.test(url.protocol) && url.hostname.includes(".") ? url.toString() : null; } catch { return null; } }
async function getBusinessOrAlias(slug: string) { const direct = await getPublicBusinessForRequest(slug); if (direct) return { business: direct, isAlias: false } as const; const alias = await resolveBusinessSlugAlias(slug); if (!alias) return null; const business = await getPublicBusinessForRequest(alias.canonicalSlug); return business ? { business, isAlias: true } as const : null; }

const schemaDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
function openingHoursSpecification(openingHours: Array<{ dayOfWeek: number; opensAt: string | null; closesAt: string | null; secondOpensAt: string | null; secondClosesAt: string | null; isClosed: boolean }>) {
  return openingHours.flatMap((item) => {
    if (item.isClosed || item.dayOfWeek < 0 || item.dayOfWeek > 6) return [];
    const dayOfWeek = `https://schema.org/${schemaDays[item.dayOfWeek]}`;
    const shifts = [[item.opensAt, item.closesAt], [item.secondOpensAt, item.secondClosesAt]] as const;
    return shifts.flatMap(([opens, closes]) => opens && closes ? [{ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes }] : []);
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const normalizedSlug = normalizePublicSlug(slug); if (!normalizedSlug || !isValidPublicSlug(normalizedSlug) || normalizedSlug !== slug) return {};
  const resolved = await getBusinessOrAlias(normalizedSlug); const business = resolved?.business; if (!business || !business.isPublished) return {};
  const canonicalUrl = `https://hee.sa/${business.slug}`; const title = business.metaTitle || `${business.name} | HEE`; const description = business.metaDescription || business.shortDescription || business.description || `صفحة ${business.name}`; const socialImageUrl = absolutePublicAssetUrl(business.coverUrl) || absolutePublicAssetUrl(business.logoUrl);
  return { title: { absolute: title }, description, alternates: { canonical: canonicalUrl }, openGraph: { title, description, type: "website", url: canonicalUrl, siteName: "HEE", locale: "ar_SA", images: socialImageUrl ? [{ url: socialImageUrl, alt: business.name }] : undefined }, twitter: { card: socialImageUrl ? "summary_large_image" : "summary", title, description, images: socialImageUrl ? [socialImageUrl] : undefined }, ...(isPreviewQaEnvironment() ? { robots: { index: false, follow: false } } : { robots: { index: true, follow: true } }) };
}

export default async function PublicBusinessPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const normalizedSlug = normalizePublicSlug(slug); if (!normalizedSlug || !isValidPublicSlug(normalizedSlug) || normalizedSlug !== slug) notFound();
  const resolved = await getBusinessOrAlias(normalizedSlug); if (!resolved || !resolved.business.isPublished) notFound(); if (resolved.isAlias) permanentRedirect(`/${resolved.business.slug}`);
  const business = resolved.business; const publicBusiness = sanitizePublicBusiness(business); const canonicalUrl = `https://hee.sa/${business.slug}`; const publicUrl = await getPublicBusinessUrlFromRequest(business.slug); const qrDataUrl = makeQrUrl(publicUrl);
  const socialUrls = [business.website, business.instagramUrl, business.tiktokUrl, business.snapchatUrl, business.xUrl, business.facebookUrl].map(safeExternalUrl).filter((value): value is string => Boolean(value)); const logoUrl = absolutePublicAssetUrl(business.logoUrl); const imageUrl = absolutePublicAssetUrl(business.coverUrl) || logoUrl;
  const hours = openingHoursSpecification(business.openingHours);
  const structuredData = { "@context": "https://schema.org", "@type": "LocalBusiness", "@id": `${canonicalUrl}#business`, name: business.name, ...(business.nameEn ? { alternateName: business.nameEn } : {}), url: canonicalUrl, ...(business.description || business.shortDescription ? { description: business.shortDescription || business.description } : {}), ...(logoUrl ? { logo: logoUrl } : {}), ...(imageUrl ? { image: imageUrl } : {}), ...(business.phone ? { telephone: business.phone } : {}), ...(business.email ? { email: business.email } : {}), ...(business.address || business.city || business.district ? { address: { "@type": "PostalAddress", ...(business.address ? { streetAddress: business.address } : {}), ...(business.district ? { addressLocality: business.district } : {}), ...(business.city ? { addressRegion: business.city } : {}), ...(business.country ? { addressCountry: business.country } : { addressCountry: "SA" }) } } : {}), ...(hours.length ? { openingHoursSpecification: hours } : {}), ...(socialUrls.length ? { sameAs: socialUrls } : {}) };
  const hasWorkingHours = publicBusiness.openingHours.some((item) => !item.isClosed && Boolean(item.opensAt && item.closesAt));
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} /><PublicBusinessAnalytics slug={business.slug} /><div className="pb-20"><PublicBusinessPageV10Light business={publicBusiness} qrDataUrl={qrDataUrl} publicUrl={publicUrl} />{publicBusiness.companyProfileUrl ? <div dir="rtl" className="mx-auto -mt-16 mb-20 w-full max-w-[580px] px-3 sm:px-4"><div className="rounded-[18px] border border-[#e9e3ef] bg-white p-3 shadow-[0_8px_24px_rgba(55,35,70,.035)]"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm text-[#302638]">{publicBusiness.companyProfileTitle || "الملف التعريفي للشركة"}</b><span className="mt-1 block text-[10px] text-[#786f7d]">PDF رسمي للمنشأة</span></div><Link href={publicBusiness.companyProfileUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-xl bg-[#6f3bd2] px-4 py-2.5 text-xs font-black text-white">فتح الملف</Link></div></div></div> : null}</div><PublicTransactionLauncher slug={publicBusiness.slug} businessName={publicBusiness.name} whatsapp={publicBusiness.whatsapp} phone={publicBusiness.phone} bookingAvailable={publicBusiness.bookingAvailable} hasWorkingHours={hasWorkingHours} services={publicBusiness.services.map((service) => ({ id: service.id, name: service.name, bookingEnabled: service.bookingEnabled, durationMinutes: service.durationMinutes }))} /></>;
}
