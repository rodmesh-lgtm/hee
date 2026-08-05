import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getBusinessPublic } from "../../actions/business";
import { PublicBusinessPage } from "../../../components/public-business-page";
import { getPublicBusinessUrlFromRequest } from "../../lib/public-url";
import { isPreviewQaEnvironment } from "../../lib/qa-audit";

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
    title: {
      // Use absolute title to avoid app-level template appending "| HEE" twice.
      absolute: business.metaTitle || `${business.name} | HEE`,
    },
    description: business.metaDescription || business.description || `صفحة ${business.name}`,
    alternates: {
      canonical: `https://hee.sa/b/${business.slug}`,
    },
    openGraph: {
      title: business.metaTitle || business.name,
      description: business.metaDescription || business.description || `صفحة ${business.name}`,
      type: "website",
      url: `https://hee.sa/b/${business.slug}`,
      images: business.coverUrl ? [{ url: business.coverUrl }] : business.logoUrl ? [{ url: business.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: business.metaTitle || business.name,
      description: business.metaDescription || business.description || `صفحة ${business.name}`,
      images: business.coverUrl ? [business.coverUrl] : business.logoUrl ? [business.logoUrl] : undefined,
    },
    ...(isPreviewQaEnvironment()
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  };
}

export default async function PublicBusinessPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessPublic(slug);
  if (!business || !business.isPublished) {
    notFound();
  }

  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const qrDataUrl = makeQrUrl(publicUrl);

  return <PublicBusinessPage business={business} qrDataUrl={qrDataUrl} publicUrl={publicUrl} />;
}
