import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/auth";
import { getPublicBusinessUrlFromRequest } from "../../../lib/public-url";
import { isPreviewQaEnvironment, isQaAuditTokenValid } from "../../../lib/qa-audit";

const OLD_ACCOUNT_EMAIL = "old.account.v52@hee-preview.local";
const OLD_ACCOUNT_PASSWORD = "Aa!12345";
const OLD_ACCOUNT_SLUG = "old-account-v52-preview";

function buildLegacyModules() {
  return JSON.stringify([
    { id: "services", enabled: true, sortOrder: 0, config: { title: "الخدمات" } },
    { id: "request", enabled: true, sortOrder: 1, config: { title: "اطلب الآن" } },
    { id: "inquiry", enabled: true, sortOrder: 2, config: { title: "استفسار" } },
    { id: "location", enabled: true, sortOrder: 3, config: {} },
    { id: "hours", enabled: true, sortOrder: 4, config: {} },
    { id: "about", enabled: true, sortOrder: 5, config: {} },
    {
      id: "contact",
      enabled: true,
      sortOrder: 6,
      config: {
        businessLinkEnabled: true,
        businessLinkType: "website",
        businessLinkUrl: "https://legacy-editor.example.com",
      },
    },
  ]);
}

export async function POST(request: Request) {
  if (!isPreviewQaEnvironment()) {
    return new NextResponse(null, { status: 404 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const authToken = bearerToken || queryToken;

  const currentUser = await getCurrentUser();
  const hasPermission = Boolean(currentUser) || isQaAuditTokenValid(authToken);
  if (!hasPermission) {
    return new NextResponse(null, { status: 404 });
  }

  const passwordHash = await hash(OLD_ACCOUNT_PASSWORD, 10);
  const user = await db.user.upsert({
    where: { email: OLD_ACCOUNT_EMAIL },
    update: {
      name: "Old Account V5.2",
      passwordHash,
    },
    create: {
      name: "Old Account V5.2",
      email: OLD_ACCOUNT_EMAIL,
      passwordHash,
    },
  });

  const business = await db.business.upsert({
    where: { slug: OLD_ACCOUNT_SLUG },
    update: {
      ownerId: user.id,
      name: "حساب قديم للاختبار",
      businessType: "خدمات منزلية",
      description: "حساب قديم ببيانات legacy لاختبار ترحيل الصفحة والمحرر مباشرة على نسخة المعاينة.",
      shortDescription: "حساب قديم بعد الترحيل",
      city: "الرياض",
      district: "العليا",
      address: "طريق العليا العام، برج 5",
      googleMapsLink: "https://maps.google.com/?q=24.7136,46.6753",
      whatsapp: "966555440011",
      phone: "0555440011",
      primaryColor: "#0f766e",
      buttonStyle: "soft",
      cardStyle: "light|bordered|md",
      pageModules: buildLegacyModules(),
      onboardingCompleted: true,
      onboardingStep: "published",
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
      bookingAvailable: true,
      acceptOnlineOrders: false,
    },
    create: {
      ownerId: user.id,
      slug: OLD_ACCOUNT_SLUG,
      name: "حساب قديم للاختبار",
      businessType: "خدمات منزلية",
      description: "حساب قديم ببيانات legacy لاختبار ترحيل الصفحة والمحرر مباشرة على نسخة المعاينة.",
      shortDescription: "حساب قديم بعد الترحيل",
      city: "الرياض",
      district: "العليا",
      address: "طريق العليا العام، برج 5",
      googleMapsLink: "https://maps.google.com/?q=24.7136,46.6753",
      whatsapp: "966555440011",
      phone: "0555440011",
      primaryColor: "#0f766e",
      buttonStyle: "soft",
      cardStyle: "light|bordered|md",
      pageModules: buildLegacyModules(),
      onboardingCompleted: true,
      onboardingStep: "published",
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
      bookingAvailable: true,
      acceptOnlineOrders: false,
    },
  });

  await db.$transaction([
    db.service.deleteMany({ where: { businessId: business.id } }),
    db.workingHours.deleteMany({ where: { businessId: business.id } }),
  ]);

  await db.service.createMany({
    data: [
      {
        businessId: business.id,
        name: "تنظيف عميق",
        description: "زيارة تنظيف كاملة",
        price: 220,
        durationMinutes: 120,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 0,
      },
      {
        businessId: business.id,
        name: "صيانة كهرباء",
        description: "إصلاح الأعطال المنزلية",
        price: 180,
        durationMinutes: 75,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 1,
      },
    ],
  });

  await db.workingHours.createMany({
    data: [
      { businessId: business.id, dayOfWeek: 0, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 2, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 3, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 4, opensAt: "09:00", closesAt: "17:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 5, opensAt: null, closesAt: null, isClosed: true },
      { businessId: business.id, dayOfWeek: 6, opensAt: null, closesAt: null, isClosed: true },
    ],
  });

  return NextResponse.json({
    previewOnly: true,
    account: {
      email: OLD_ACCOUNT_EMAIL,
      password: OLD_ACCOUNT_PASSWORD,
      slug: OLD_ACCOUNT_SLUG,
      publicUrl: await getPublicBusinessUrlFromRequest(OLD_ACCOUNT_SLUG),
      dashboardUrl: "/dashboard/my-page?edit=1",
    },
  });
}