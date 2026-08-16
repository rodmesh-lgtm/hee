import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getBusinessPublic } from "../actions/business";
import { PublicBusinessPageV3 } from "../../components/public-business-page-v3";
import { getPublicBusinessUrlFromRequest, isValidPublicSlug, normalizePublicSlug } from "../lib/public-url";
import { isPreviewQaEnvironment } from "../lib/qa-audit";
import { resolveBusinessSlugAlias } from "../lib/slug-alias";

export const dynamic = "force-dynamic";

const getPublicBusinessForRequest = cache((slug: string) => getBusinessPublic(slug));

function makeQrUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function absolutePublicAssetUrl(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(raw, "https://hee.sa").toString();
  } catch {
    return null;
  }
}

async function getBusinessOrAlias(slug: string) {
  const direct = await getPublicBusinessForRequest(slug);
  if (direct) return { business: direct, isAlias: false } as const;

  const alias = await resolveBusinessSlugAlias(slug);
  if (!alias) return null;

  const business = await getPublicBusinessForRequest(alias.canonicalSlug);
  if (!business) return null;
  return { business, isAlias: true } as const;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizePublicSlug(slug);
  if (!normalizedSlug || !isValidPublicSlug(normalizedSlug) || normalizedSlug !== slug) return {};

  const resolved = await getBusinessOrAlias(normalizedSlug);
  const business = resolved?.business;
  if (!business || !business.isPublished) return {};

  return {
    title: { absolute: business.metaTitle || `${business.name} | HEE` },
    description: business.metaDescription || business.description || `صفحة ${business.name}`,
    alternates: { canonical: `https://hee.sa/${business.slug}` },
    openGraph: {
      title: business.metaTitle || business.name,
      description: business.metaDescription || business.description || `صفحة ${business.name}`,
      type: "website",
      url: `https://hee.sa/${business.slug}`,
      images: business.coverUrl ? [{ url: business.coverUrl }] : business.logoUrl ? [{ url: business.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: business.metaTitle || business.name,
      description: business.metaDescription || business.description || `صفحة ${business.name}`,
      images: business.coverUrl ? [business.coverUrl] : business.logoUrl ? [business.logoUrl] : undefined,
    },
    ...(isPreviewQaEnvironment() ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function PublicBusinessPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = normalizePublicSlug(slug);

  if (!normalizedSlug || !isValidPublicSlug(normalizedSlug) || normalizedSlug !== slug) notFound();

  const resolved = await getBusinessOrAlias(normalizedSlug);
  if (!resolved || !resolved.business.isPublished) notFound();
  if (resolved.isAlias) permanentRedirect(`/${resolved.business.slug}`);

  const business = resolved.business;
  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const qrDataUrl = makeQrUrl(publicUrl);
  const socialUrls = [business.website, business.instagramUrl, business.tiktokUrl, business.snapchatUrl, business.xUrl, business.facebookUrl].filter((value): value is string => Boolean(value));
  const logoUrl = absolutePublicAssetUrl(business.logoUrl);
  const imageUrl = absolutePublicAssetUrl(business.coverUrl) || logoUrl;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://hee.sa/${business.slug}#business`,
    name: business.name,
    ...(business.nameEn ? { alternateName: business.nameEn } : {}),
    url: `https://hee.sa/${business.slug}`,
    ...(business.description ? { description: business.description } : {}),
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.address || business.city || business.district ? {
      address: {
        "@type": "PostalAddress",
        ...(business.address ? { streetAddress: business.address } : {}),
        ...(business.district ? { addressLocality: business.district } : {}),
        ...(business.city ? { addressRegion: business.city } : {}),
        ...(business.country ? { addressCountry: business.country } : { addressCountry: "SA" }),
      },
    } : {}),
    ...(socialUrls.length ? { sameAs: socialUrls } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <PublicBusinessPageV3 business={business} qrDataUrl={qrDataUrl} publicUrl={publicUrl} />
    </>
  );
}
