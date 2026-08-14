import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBusinessPublic } from "../actions/business";
import { PublicBusinessPageV3 } from "../../components/public-business-page-v3";
import { getPublicBusinessUrlFromRequest, isValidPublicSlug, normalizePublicSlug } from "../lib/public-url";
import { isPreviewQaEnvironment } from "../lib/qa-audit";

export const dynamic = "force-dynamic";

function makeQrUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessPublic(slug);
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

  const business = await getBusinessPublic(normalizedSlug);
  if (!business || !business.isPublished) notFound();

  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const qrDataUrl = makeQrUrl(publicUrl);

  return <PublicBusinessPageV3 business={business} qrDataUrl={qrDataUrl} publicUrl={publicUrl} />;
}
