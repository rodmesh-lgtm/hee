import type { MetadataRoute } from "next";
import { db } from "./lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: "https://ir.sa", changeFrequency: "weekly", priority: 1 },
    { url: "https://ir.sa/contact", changeFrequency: "monthly", priority: 0.5 },
    { url: "https://ir.sa/privacy", changeFrequency: "yearly", priority: 0.2 },
    { url: "https://ir.sa/terms", changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const businesses = await db.business.findMany({ where: { isPublished: true, deletedAt: null, owner: { deletedAt: null, emailVerifiedAt: { not: null } } }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" } });
    return [...staticPages, ...businesses.map((business) => ({ url: `https://ir.sa/${business.slug}`, lastModified: business.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 }))];
  } catch { return staticPages; }
}
