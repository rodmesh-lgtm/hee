import "server-only";

import { db } from "./db";

export async function getBusinessPublic(slug: string) {
  return db.business.findFirst({
    where: {
      slug,
      deletedAt: null,
      isPublished: true,
      owner: { deletedAt: null, emailVerifiedAt: { not: null } },
    },
    include: {
      services: {
        where: { isActive: true, deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          bookingEnabled: true,
          durationMinutes: true,
        },
      },
      openingHours: {
        orderBy: { dayOfWeek: "asc" },
        select: {
          dayOfWeek: true,
          opensAt: true,
          closesAt: true,
          secondOpensAt: true,
          secondClosesAt: true,
          isClosed: true,
        },
      },
      galleryItems: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: { id: true, imageUrl: true, caption: true, isActive: true },
      },
      branches: {
        where: { isActive: true },
        orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          city: true,
          district: true,
          address: true,
          googleMapsLink: true,
          isActive: true,
          bookingEnabled: true,
          bookingSlotMinutes: true,
          bookingCapacity: true,
        },
      },
      whatsappAutomations: {
        where: {
          status: "active",
          triggerType: "booking_confirmation",
          connection: { provider: "meta", status: "connected", disabledAt: null, bookingEnabled: true },
        },
        orderBy: { activatedAt: "desc" },
        take: 1,
        select: {
          actionConfig: true,
          connectionId: true,
          connection: { select: { status: true, disabledAt: true, verifiedName: true, displayPhoneNumber: true } },
        },
      },
      whatsappTemplates: {
        where: { provider: "meta", status: "approved" },
        select: { id: true, connectionId: true, components: true, parameterFormat: true },
      },
      whatsappCommerceIntegrations: {
        where: { provider: "salla", status: "active" },
        take: 1,
        select: { id: true },
      },
      // ContactPerson is the canonical team table. Loading the same rows again
      // through Department.contacts doubled the public query and payload without
      // adding any information used by the current renderer.
      contactPersons: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          jobTitle: true,
          imageUrl: true,
          phone: true,
          whatsapp: true,
          isActive: true,
          department: { select: { name: true } },
        },
      },
    },
  });
}
