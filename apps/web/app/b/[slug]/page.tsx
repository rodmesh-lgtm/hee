import { notFound, redirect } from "next/navigation";
import { isValidPublicSlug, normalizePublicSlug } from "../../lib/public-url";

export default async function LegacyPublicBusinessPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = normalizePublicSlug(slug);
  if (!normalizedSlug || normalizedSlug !== slug || !isValidPublicSlug(normalizedSlug)) {
    notFound();
  }
  redirect(`/${normalizedSlug}`);
}
