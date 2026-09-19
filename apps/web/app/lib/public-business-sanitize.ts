import { normalizeGoogleMapsUrl } from "./google-maps-url";
import { bookingConfirmationTemplateSupportsParameters } from "./whatsapp/booking-confirmation-domain";

type PublicRecord = Record<string, unknown>;
function clean(value: unknown): string | null { if (typeof value !== "string") return null; const result = value.trim(); return result || null; }
function asRecord(value: unknown): PublicRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as PublicRecord : {}; }
function asRecords(value: unknown): PublicRecord[] { return Array.isArray(value) ? value.map(asRecord) : []; }

/** Only explicitly public fields may cross the server/client boundary. */
export function sanitizePublicBusiness(input: unknown) {
  const business = asRecord(input);
  const bookingConfirmationAutomation = asRecords(business.whatsappAutomations)[0];
  const bookingConnection = asRecord(bookingConfirmationAutomation?.connection);
  const actionConfig = asRecord(bookingConfirmationAutomation?.actionConfig);
  const bookingTemplate = asRecords(business.whatsappTemplates).find((template) => (
    String(template.id ?? "") === String(actionConfig.templateId ?? "")
    && String(template.connectionId ?? "") === String(bookingConfirmationAutomation?.connectionId ?? "")
  ));
  const whatsappBookingConfirmationAvailable = Boolean(
    bookingConfirmationAutomation
    && bookingConnection.status === "connected"
    && !bookingConnection.disabledAt
    && bookingTemplate
    && bookingConfirmationTemplateSupportsParameters(bookingTemplate.components, clean(bookingTemplate.parameterFormat)),
  );
  return {
    id: String(business.id ?? ""), slug: String(business.slug ?? ""), name: String(business.name ?? ""),
    nameEn: clean(business.nameEn), description: clean(business.description), shortDescription: clean(business.shortDescription),
    businessCategory: clean(business.businessCategory), businessType: clean(business.businessType), city: clean(business.city), district: clean(business.district), address: clean(business.address), country: clean(business.country),
    phone: clean(business.phone), whatsapp: clean(business.whatsapp), email: clean(business.email), website: clean(business.website), logoUrl: clean(business.logoUrl), coverUrl: clean(business.coverUrl),
    companyProfileUrl: clean(business.companyProfileUrl), companyProfileTitle: clean(business.companyProfileTitle),
    googleMapsLink: normalizeGoogleMapsUrl(clean(business.googleMapsLink)), workingHours: clean(business.workingHours), isVerified: Boolean(business.isVerified), bookingAvailable: Boolean(business.bookingAvailable),
    sallaBookingEligibilityRequired: asRecords(business.whatsappCommerceIntegrations).length > 0,
    whatsappBookingConfirmationAvailable,
    whatsappBookingSender: whatsappBookingConfirmationAvailable ? clean(bookingConnection.verifiedName) ?? clean(bookingConnection.displayPhoneNumber) : null,
    services: asRecords(business.services).map((service) => ({ id: String(service.id ?? ""), name: clean(service.name), description: clean(service.description), isActive: service.isActive !== false, bookingEnabled: Boolean(service.bookingEnabled), durationMinutes: typeof service.durationMinutes === "number" ? service.durationMinutes : null })),
    branches: asRecords(business.branches).map((branch) => ({ id: String(branch.id ?? ""), name: clean(branch.name), city: clean(branch.city), district: clean(branch.district), address: clean(branch.address), googleMapsLink: normalizeGoogleMapsUrl(clean(branch.googleMapsLink)), isActive: branch.isActive !== false, bookingEnabled: branch.bookingEnabled !== false, bookingSlotMinutes: typeof branch.bookingSlotMinutes === "number" ? branch.bookingSlotMinutes : 120, bookingCapacity: typeof branch.bookingCapacity === "number" ? branch.bookingCapacity : 10 })),
    contactPersons: asRecords(business.contactPersons).map((contact) => { const department = asRecord(contact.department); return { id: String(contact.id ?? ""), name: clean(contact.name), jobTitle: clean(contact.jobTitle), imageUrl: clean(contact.imageUrl), phone: clean(contact.phone), whatsapp: clean(contact.whatsapp), isActive: contact.isActive !== false, department: department.name ? { name: String(department.name) } : null }; }),
    openingHours: asRecords(business.openingHours).map((item) => ({ dayOfWeek: typeof item.dayOfWeek === "number" ? item.dayOfWeek : null, opensAt: clean(item.opensAt), closesAt: clean(item.closesAt), secondOpensAt: clean(item.secondOpensAt), secondClosesAt: clean(item.secondClosesAt), isClosed: Boolean(item.isClosed) })),
    galleryItems: asRecords(business.galleryItems).map((item) => ({ id: String(item.id ?? ""), imageUrl: clean(item.imageUrl), title: clean(item.caption), isActive: item.isActive !== false })),
  };
}
