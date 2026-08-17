function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function safeGoogleMapsUrl(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    const isGoogleMap = host === "maps.app.goo.gl" || host.endsWith("google.com") || host.endsWith("google.sa") || host === "goo.gl";
    return isGoogleMap ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Public pages are client components, so everything passed here is serialized
 * to the visitor. Keep this as an explicit allow-list: never spread the full
 * Prisma Business record into the public page.
 */
export function sanitizePublicBusiness(business: any) {
  return {
    id: String(business.id),
    slug: String(business.slug ?? ""),
    name: String(business.name ?? ""),
    nameEn: clean(business.nameEn) || null,
    description: clean(business.description) || null,
    shortDescription: clean(business.shortDescription) || null,
    businessCategory: clean(business.businessCategory) || null,
    businessType: clean(business.businessType) || null,
    city: clean(business.city) || null,
    district: clean(business.district) || null,
    address: clean(business.address) || null,
    country: clean(business.country) || null,
    phone: clean(business.phone) || null,
    whatsapp: clean(business.whatsapp) || null,
    email: clean(business.email) || null,
    website: clean(business.website) || null,
    logoUrl: clean(business.logoUrl) || null,
    coverUrl: clean(business.coverUrl) || null,
    googleMapsLink: safeGoogleMapsUrl(business.googleMapsLink),
    workingHours: clean(business.workingHours) || null,
    isVerified: Boolean(business.isVerified),

    services: (business.services ?? []).map((service: any) => ({
      id: String(service.id),
      name: clean(service.name) || null,
      description: clean(service.description) || null,
      isActive: service.isActive !== false,
    })),

    branches: (business.branches ?? []).map((branch: any) => ({
      id: String(branch.id),
      name: clean(branch.name) || null,
      city: clean(branch.city) || null,
      district: clean(branch.district) || null,
      address: clean(branch.address) || null,
      googleMapsLink: safeGoogleMapsUrl(branch.googleMapsLink),
      isActive: branch.isActive !== false,
    })),

    contactPersons: (business.contactPersons ?? []).map((contact: any) => ({
      id: String(contact.id),
      name: clean(contact.name) || null,
      jobTitle: clean(contact.jobTitle) || null,
      imageUrl: clean(contact.imageUrl) || null,
      phone: clean(contact.phone) || null,
      whatsapp: clean(contact.whatsapp) || null,
      isActive: contact.isActive !== false,
      department: contact.department?.name ? { name: String(contact.department.name) } : null,
    })),

    departments: (business.departments ?? []).map((department: any) => ({
      id: String(department.id),
      name: clean(department.name) || null,
      isActive: department.isActive !== false,
      contacts: (department.contacts ?? []).map((contact: any) => ({
        id: String(contact.id),
        name: clean(contact.name) || null,
        jobTitle: clean(contact.jobTitle) || null,
        imageUrl: clean(contact.imageUrl) || null,
        phone: clean(contact.phone) || null,
        whatsapp: clean(contact.whatsapp) || null,
        isActive: contact.isActive !== false,
      })),
    })),

    openingHours: (business.openingHours ?? []).map((item: any) => ({
      dayOfWeek: typeof item.dayOfWeek === "number" ? item.dayOfWeek : null,
      opensAt: clean(item.opensAt) || null,
      closesAt: clean(item.closesAt) || null,
      secondOpensAt: clean(item.secondOpensAt) || null,
      secondClosesAt: clean(item.secondClosesAt) || null,
      isClosed: Boolean(item.isClosed),
    })),

    galleryItems: (business.galleryItems ?? []).map((item: any) => ({
      id: String(item.id),
      imageUrl: clean(item.imageUrl) || null,
      title: clean(item.title) || null,
      isActive: item.isActive !== false,
    })),
  };
}
