import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/auth";
import { getActiveBusinessForUser } from "../../../lib/active-business";
import { consumePublicWriteLimit } from "../../../lib/rate-limit";

const MAX_EXPORT_BYTES = 10 * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "لا توجد منشأة نشطة" }, { status: 404 });

  try {
    const rate = await consumePublicWriteLimit({ scope: "customer-data-export", businessId: business.id, identity: user.id, limit: 5, windowSeconds: 60 * 60 });
    if (!rate.allowed) return NextResponse.json({ error: "تم طلب التصدير عدة مرات. حاول لاحقًا." }, { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } });
  } catch (error) {
    console.error("[data-export] rate_limit_failed", { businessId: business.id, error });
    return NextResponse.json({ error: "تعذر تجهيز التصدير الآن" }, { status: 503, headers: { "Retry-After": "30" } });
  }

  const [account, fullBusiness, products, services, offers, branches, departments, contacts, gallery, hours, customers, orders, bookings, subscriptions] = await Promise.all([
    db.user.findFirst({ where: { id: user.id, deletedAt: null }, select: { id: true, name: true, email: true, emailVerifiedAt: true, createdAt: true, updatedAt: true } }),
    db.business.findFirst({ where: { id: business.id, ownerId: user.id, deletedAt: null }, select: { id: true, name: true, nameEn: true, slug: true, businessType: true, description: true, shortDescription: true, entityType: true, businessCategory: true, email: true, website: true, country: true, city: true, district: true, googleMapsLink: true, whatsapp: true, phone: true, address: true, logoUrl: true, coverUrl: true, primaryColor: true, secondaryColor: true, buttonColor: true, buttonStyle: true, cardStyle: true, pageModules: true, deliveryAvailable: true, bookingAvailable: true, acceptOnlineOrders: true, xUrl: true, instagramUrl: true, snapchatUrl: true, tiktokUrl: true, facebookUrl: true, metaTitle: true, metaDescription: true, isVerified: true, isPublished: true, publishedAt: true, createdAt: true, updatedAt: true, digitalDestinationType: true, companyProfileUrl: true, companyProfileTitle: true, licenseNumber: true, plan: { select: { code: true, name: true } } } }),
    db.product.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.service.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.offer.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.branch.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.department.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.contactPerson.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.galleryItem.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.workingHours.findMany({ where: { businessId: business.id }, orderBy: { dayOfWeek: "asc" } }),
    db.customer.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.order.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" }, include: { items: true } }),
    db.booking.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    db.subscription.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" }, include: { plan: { select: { code: true, name: true } } } }),
  ]);

  if (!account || !fullBusiness) return NextResponse.json({ error: "تعذر العثور على بيانات الحساب" }, { status: 404 });
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), account, business: fullBusiness, products, services, offers, branches, departments, contacts, gallery, workingHours: hours, customers, orders, bookings, subscriptions }, null, 2);
  if (Buffer.byteLength(payload, "utf8") > MAX_EXPORT_BYTES) {
    return NextResponse.json({ error: "حجم البيانات كبير للتصدير المباشر. أرسل طلبًا من مركز الدعم." }, { status: 413 });
  }

  const safeSlug = business.slug.replace(/[^a-z0-9-]/gi, "-");
  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="hee-${safeSlug}-data.json"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
