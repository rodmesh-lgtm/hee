import type { MetadataRoute } from "next";
import { db } from "./lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: "https://hee.sa", changeFrequency: "weekly", priority: 1 },
    { url: "https://hee.sa/contact", changeFrequency: "monthly", priority: 0.5 },
    { url: "https://hee.sa/privacy", changeFrequency: "yearly", priority: 0.2 },
    { url: "https://hee.sa/terms", changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const businesses = await db.business.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        owner: { deletedAt: null, emailVerifiedAt: { not: null } },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    return [
      ...staticPages,
      ...businesses.map((business) => ({
        url: `https://hee.sa/${business.slug}`,
        lastModified: business.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // Keep the sitemap endpoint available even during a transient database outage.
    return staticPages;
  }
}
