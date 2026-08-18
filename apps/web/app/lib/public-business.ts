import "server-only";

import { db } from "./db";

export async function getBusinessPublic(slug: string) {
  const now = new Date();
  return db.business.findFirst({
    where: { slug, deletedAt: null, isPublished: true },
    include: {
      products: {
        where: { isActive: true, deletedAt: null },
        include: { category: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      },
      offers: {
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { AND: [{ startsAt: null }, { endsAt: null }] },
            { AND: [{ startsAt: { lte: now } }, { endsAt: null }] },
            { AND: [{ startsAt: null }, { endsAt: { gte: now } }] },
            { AND: [{ startsAt: { lte: now } }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: [{ createdAt: "desc" }],
      },
      socialLinks: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      services: { where: { isActive: true, deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
      openingHours: { orderBy: { dayOfWeek: "asc" } },
      galleryItems: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
      branches: { where: { isActive: true }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      contactPersons: {
        where: { isActive: true },
        include: { branch: true, department: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
      departments: {
        where: { isActive: true },
        include: {
          contacts: {
            where: { isActive: true },
            include: { branch: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}
