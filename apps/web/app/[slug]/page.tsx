import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBusinessPublic } from "../actions/business";
import { PublicBusinessPageV3 } from "../../components/public-business-page-v3";
import { getPublicBusinessUrlFromRequest, isValidPublicSlug, normalizePublicSlug } from "../lib/public-url";
import { isPreviewQaEnvironment } from "../lib/qa-audit";

export const dynamic = "force-dynamic";

// generateMetadata and the page render run during the same request. React cache keeps the
// relatively rich business graph query from executing twice for every public page view.
const getPublicBusinessForRequest = cache((slug: string) => getBusinessPublic(slug));

function makeQrUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizePublicSlug(slug);
  if (!normalizedSlug || !isValidPublicSlug(normalizedSlug) || normalizedSlug !== slug) return {};

  const business = await getPublicBusinessForRequest(normalizedSlug);
  if (!business || !business.isPublished) {
    return {};
  }

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

  const business = await getPublicBusinessForRequest(normalizedSlug);
  if (!business || !business.isPublished) notFound();

  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const qrDataUrl = makeQrUrl(publicUrl);
  const socialUrls = [business.website, business.instagramUrl, business.tiktokUrl, business.snapchatUrl, business.xUrl, business.facebookUrl].filter((value): value is string => Boolean(value));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://hee.sa/${business.slug}#business`,
    name: business.name,
    ...(business.nameEn ? { alternateName: business.nameEn } : {}),
    url: `https://hee.sa/${business.slug}`,
    ...(business.description ? { description: business.description } : {}),
    ...(business.logoUrl ? { logo: business.logoUrl, image: business.coverUrl || business.logoUrl } : business.coverUrl ? { image: business.coverUrl } : {}),
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
