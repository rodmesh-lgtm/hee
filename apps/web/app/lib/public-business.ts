import "server-only";

import { db } from "./db";

export async function getBusinessPublic(slug: string) {
  return db.business.findFirst({
    where: {
      slug,
      deletedAt: null,
      isPublished: true,
      // Re-check mailbox ownership at the public read boundary. This protects legacy
      // rows that may have been published before email verification became mandatory.
      owner: { deletedAt: null, emailVerifiedAt: { not: null } },
    },
    include: {
      services: {
        where: { isActive: true, deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: { id: true, name: true, description: true, isActive: true, bookingEnabled: true, durationMinutes: true },
      },
      openingHours: {
        orderBy: { dayOfWeek: "asc" },
        select: { dayOfWeek: true, opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
      },
      galleryItems: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: { id: true, imageUrl: true, caption: true, isActive: true },
      },
      branches: {
        where: { isActive: true },
        orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, city: true, district: true, address: true, googleMapsLink: true, isActive: true },
      },
      contactPersons: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true, name: true, jobTitle: true, imageUrl: true, phone: true, whatsapp: true, isActive: true,
          department: { select: { name: true } },
        },
      },
    },
  });
}
