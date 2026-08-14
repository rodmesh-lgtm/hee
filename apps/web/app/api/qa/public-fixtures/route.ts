import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/auth";
import { getDefaultPageModules, serializePageModules, type PageModuleId } from "../../../lib/page-modules";
import { getPublicBusinessUrlFromRequest } from "../../../lib/public-url";
import { isPreviewQaEnvironment, isQaAuditTokenValid } from "../../../lib/qa-audit";

type FixtureKind = "restaurant" | "services" | "store";
type ExtendedFixtureKind = FixtureKind | "long-content";

type FixtureResult = {
  kind: ExtendedFixtureKind;
  slug: string;
  publicUrl: string;
};

function fixturesModules(
  businessType: string,
  enabled: PageModuleId[],
  configById?: Partial<Record<PageModuleId, Record<string, unknown>>>,
) {
  const defaults = getDefaultPageModules(businessType);
  const enabledSet = new Set(enabled);
  return serializePageModules(
    defaults.map((module) => ({
      ...module,
      enabled: enabledSet.has(module.id),
      config: {
        ...module.config,
        ...(configById?.[module.id] ?? {}),
      },
    })),
  );
}

function fakeCover(label: string) {
  return "/demo/restaurant-cover.jpg";
}

function fakeLogo(label: string) {
  return "/demo/restaurant-logo.jpg";
}

async function ensureFixtureOwner() {
  const seedEmail = "qa.public.fixtures@hee-preview.local";
  const seedPasswordHash = await hash("Qa-public-fixtures-2026", 10);

  return db.user.upsert({
    where: { email: seedEmail },
    update: { name: "HEE QA Fixtures", passwordHash: seedPasswordHash },
    create: {
      name: "HEE QA Fixtures",
      email: seedEmail,
      passwordHash: seedPasswordHash,
    },
  });
}

async function upsertRestaurant(ownerId: string): Promise<FixtureResult> {
  const slug = `qa-v5-restaurant-${ownerId.slice(0, 8)}`;
  const businessType = "مطاعم ومقاهي";

  const salesTeam = [
    { id: "rs-1", name: "سلمان الشمري", title: "مستشار مبيعات", whatsapp: "966555810101", phone: "0555810101", email: "sales1@qa-restaurant.local", visible: true, sortOrder: 0 },
    { id: "rs-2", name: "ريم العتيبي", title: "تنسيق الحجوزات", whatsapp: "966555810102", phone: "0555810102", email: "sales2@qa-restaurant.local", visible: true, sortOrder: 1 },
  ];

  const supportTeam = [
    { id: "rc-1", name: "نورة الدوسري", title: "خدمة العملاء", whatsapp: "966555810201", phone: "0555810201", email: "support1@qa-restaurant.local", visible: true, sortOrder: 0 },
    { id: "rc-2", name: "تركي الحربي", title: "متابعة الطلبات", whatsapp: "966555810202", phone: "0555810202", email: "support2@qa-restaurant.local", visible: true, sortOrder: 1 },
  ];

  const business = await db.business.upsert({
    where: { slug },
    update: {
      ownerId,
      name: "مطعم الاختبار - QA V5",
      businessType,
      description: "مطعم تجريبي مخصص لاختبارات المعاينة. يقدم وجبات عربية مع خدمة حجز واستفسار مباشر.",
      shortDescription: "مطعم تجريبي لاختبارات QA",
      city: "الرياض",
      district: "حي الياسمين",
      address: "طريق أنس بن مالك، مبنى 12، الدور الأرضي",
      googleMapsLink: "https://maps.google.com/?q=24.8081,46.6425",
      whatsapp: "966555100101",
      phone: "0555100101",
      logoUrl: fakeLogo("QA Restaurant Logo"),
      coverUrl: fakeCover("QA Restaurant Cover"),
      primaryColor: "#5D43EF",
      buttonStyle: "filled",
      cardStyle: "light|bordered|md",
      pageModules: fixturesModules(
        businessType,
        ["services", "request", "inquiry", "location", "hours", "about", "contact", "contactTeam"],
        {
          services: { title: "القائمة" },
          contact: {
            careersEnabled: true,
            careersEmail: "careers.restaurant@hee-qa.local",
            careersLabel: "انضم إلى فريقنا",
            businessLinkEnabled: true,
            businessLinkType: "website",
            businessLinkUrl: "https://restaurant-qa.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
        },
      ),
      bookingAvailable: true,
      acceptOnlineOrders: false,
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
    },
    create: {
      ownerId,
      name: "مطعم الاختبار - QA V5",
      slug,
      businessType,
      description: "مطعم تجريبي مخصص لاختبارات المعاينة. يقدم وجبات عربية مع خدمة حجز واستفسار مباشر.",
      shortDescription: "مطعم تجريبي لاختبارات QA",
      city: "الرياض",
      district: "حي الياسمين",
      address: "طريق أنس بن مالك، مبنى 12، الدور الأرضي",
      googleMapsLink: "https://maps.google.com/?q=24.8081,46.6425",
      whatsapp: "966555100101",
      phone: "0555100101",
      logoUrl: fakeLogo("QA Restaurant Logo"),
      coverUrl: fakeCover("QA Restaurant Cover"),
      primaryColor: "#5D43EF",
      buttonStyle: "filled",
      cardStyle: "light|bordered|md",
      pageModules: fixturesModules(
        businessType,
        ["services", "request", "inquiry", "location", "hours", "about", "contact", "contactTeam"],
        {
          services: { title: "القائمة" },
          contact: {
            careersEnabled: true,
            careersEmail: "careers.restaurant@hee-qa.local",
            careersLabel: "انضم إلى فريقنا",
            businessLinkEnabled: true,
            businessLinkType: "website",
            businessLinkUrl: "https://restaurant-qa.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
        },
      ),
      bookingAvailable: true,
      acceptOnlineOrders: false,
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
      onboardingCompleted: true,
    },
  });

  await db.$transaction([
    db.service.deleteMany({ where: { businessId: business.id } }),
    db.offer.deleteMany({ where: { businessId: business.id } }),
    db.workingHours.deleteMany({ where: { businessId: business.id } }),
  ]);

  await db.service.createMany({
    data: [
      {
        businessId: business.id,
        name: "وجبة فطور عربي",
        description: "بيض، فول، جبن، خبز ساخن، وشاي",
        price: 34,
        durationMinutes: 20,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 0,
      },
      {
        businessId: business.id,
        name: "وجبة غداء يومية",
        description: "طبق رئيسي مع سلطة ومشروب",
        price: 59,
        durationMinutes: 25,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 1,
      },
      {
        businessId: business.id,
        name: "جلسة عائلية",
        description: "حجز طاولة لـ 6 أشخاص",
        price: 120,
        durationMinutes: 90,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 2,
      },
      {
        businessId: business.id,
        name: "منيو الأطفال",
        description: "خيارات مناسبة للأطفال",
        price: 29,
        durationMinutes: 15,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 3,
      },
    ],
  });

  await db.offer.createMany({
    data: [
      {
        businessId: business.id,
        title: "عرض الغداء",
        description: "خصم 20% على وجبة الغداء يومياً من 1م حتى 4م",
        discountLabel: "خصم 20%",
        isActive: true,
        sortOrder: 0,
      },
      {
        businessId: business.id,
        title: "عرض العائلة",
        description: "اطلب 2 وجبة رئيسية واحصل على حلوى مجانية",
        discountLabel: "هدية مجانية",
        isActive: true,
        sortOrder: 1,
      },
    ],
  });

  await db.workingHours.createMany({
    data: [
      { businessId: business.id, dayOfWeek: 0, opensAt: "08:00", closesAt: "23:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 1, opensAt: "08:00", closesAt: "23:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 2, opensAt: "08:00", closesAt: "23:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 3, opensAt: "08:00", closesAt: "23:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 4, opensAt: "10:00", closesAt: "01:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 5, opensAt: "10:00", closesAt: "01:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 6, opensAt: "09:00", closesAt: "22:00", isClosed: false },
    ],
  });

  return { kind: "restaurant", slug, publicUrl: await getPublicBusinessUrlFromRequest(slug) };
}

async function upsertServices(ownerId: string): Promise<FixtureResult> {
  const slug = `qa-v5-services-${ownerId.slice(0, 8)}`;
  const businessType = "خدمات منزلية";

  const salesTeam = [
    { id: "ss-1", name: "عمر الناصر", title: "مبيعات", whatsapp: "966555820101", phone: "0555820101", email: "sales1@qa-services.local", visible: true, sortOrder: 0 },
    { id: "ss-2", name: "مي الغامدي", title: "استشارات", whatsapp: "966555820102", phone: "0555820102", email: "sales2@qa-services.local", visible: true, sortOrder: 1 },
    { id: "ss-3", name: "هشام القرني", title: "حجوزات", whatsapp: "966555820103", phone: "0555820103", email: "sales3@qa-services.local", visible: true, sortOrder: 2 },
  ];

  const supportTeam = [
    { id: "sc-1", name: "شهد اليامي", title: "خدمة العملاء", whatsapp: "966555820201", phone: "0555820201", email: "support1@qa-services.local", visible: true, sortOrder: 0 },
    { id: "sc-2", name: "رائد الشهراني", title: "دعم فني", whatsapp: "966555820202", phone: "0555820202", email: "support2@qa-services.local", visible: true, sortOrder: 1 },
    { id: "sc-3", name: "مها الدخيل", title: "متابعة", whatsapp: "966555820203", phone: "0555820203", email: "support3@qa-services.local", visible: true, sortOrder: 2 },
  ];

  const portfolioItems = [
    { id: "sp-1", title: "تنظيف فيلا كاملة", description: "تنفيذ خلال يوم واحد", imageUrl: "/demo/restaurant-cover.jpg", url: "https://example.com/portfolio/cleaning-1", visible: true, sortOrder: 0 },
    { id: "sp-2", title: "صيانة شقة", description: "كهرباء وسباكة", imageUrl: "/demo/restaurant-cover.jpg", url: "https://example.com/portfolio/maintenance-2", visible: true, sortOrder: 1 },
    { id: "sp-3", title: "تركيب أثاث مكتبي", description: "مكتب كامل", imageUrl: "/demo/restaurant-cover.jpg", url: "https://example.com/portfolio/furniture-3", visible: true, sortOrder: 2 },
  ];

  const business = await db.business.upsert({
    where: { slug },
    update: {
      ownerId,
      name: "خدمات البيت الذكي - QA V5",
      businessType,
      description: "فريق خدمات منزلية تجريبي لاختبار تجربة الطلب والحجز والمعاينة المباشرة.",
      shortDescription: "خدمات منزلية سريعة",
      city: "جدة",
      district: "الروضة",
      address: "شارع الأمير سلطان، مبنى 8",
      googleMapsLink: "https://maps.google.com/?q=21.5664,39.1735",
      whatsapp: "966555200202",
      phone: null,
      logoUrl: fakeLogo("QA Services Logo"),
      coverUrl: fakeCover("QA Services Cover"),
      primaryColor: "#0f766e",
      buttonStyle: "soft",
      cardStyle: "light|bordered|md",
      pageModules: fixturesModules(
        businessType,
        ["services", "request", "inquiry", "location", "hours", "about", "contact", "contactTeam", "portfolio"],
        {
          services: { title: "خدماتنا" },
          contact: {
            careersEnabled: true,
            careersEmail: "careers.services@hee-qa.local",
            careersLabel: "الوظائف",
            businessLinkEnabled: true,
            businessLinkType: "website",
            businessLinkUrl: "https://services-qa.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
          portfolio: { title: "أعمالنا", portfolioItems },
        },
      ),
      bookingAvailable: true,
      acceptOnlineOrders: false,
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
    },
    create: {
      ownerId,
      name: "خدمات البيت الذكي - QA V5",
      slug,
      businessType,
      description: "فريق خدمات منزلية تجريبي لاختبار تجربة الطلب والحجز والمعاينة المباشرة.",
      shortDescription: "خدمات منزلية سريعة",
      city: "جدة",
      district: "الروضة",
      address: "شارع الأمير سلطان، مبنى 8",
      googleMapsLink: "https://maps.google.com/?q=21.5664,39.1735",
      whatsapp: "966555200202",
      phone: null,
      logoUrl: fakeLogo("QA Services Logo"),
      coverUrl: fakeCover("QA Services Cover"),
      primaryColor: "#0f766e",
      buttonStyle: "soft",
      cardStyle: "light|bordered|md",
      pageModules: fixturesModules(
        businessType,
        ["services", "request", "inquiry", "location", "hours", "about", "contact", "contactTeam", "portfolio"],
        {
          services: { title: "خدماتنا" },
          contact: {
            careersEnabled: true,
            careersEmail: "careers.services@hee-qa.local",
            careersLabel: "الوظائف",
            businessLinkEnabled: true,
            businessLinkType: "website",
            businessLinkUrl: "https://services-qa.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
          portfolio: { title: "أعمالنا", portfolioItems },
        },
      ),
      bookingAvailable: true,
      acceptOnlineOrders: false,
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
      onboardingCompleted: true,
    },
  });

  await db.$transaction([
    db.service.deleteMany({ where: { businessId: business.id } }),
    db.offer.deleteMany({ where: { businessId: business.id } }),
    db.workingHours.deleteMany({ where: { businessId: business.id } }),
  ]);

  await db.service.createMany({
    data: [
      {
        businessId: business.id,
        name: "تنظيف شامل",
        description: "زيارة تنظيف منزل كامل مع فريق متخصص",
        price: 220,
        durationMinutes: 120,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 0,
      },
      {
        businessId: business.id,
        name: "صيانة كهرباء",
        description: "فحص وإصلاح الأعطال الكهربائية المنزلية",
        price: 180,
        durationMinutes: 90,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 1,
      },
      {
        businessId: business.id,
        name: "صيانة سباكة",
        description: "معالجة التسريبات والأعطال السريعة",
        price: 160,
        durationMinutes: 75,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 2,
      },
      {
        businessId: business.id,
        name: "تركيب أثاث",
        description: "تركيب وفك الأثاث المكتبي والمنزلي",
        price: 140,
        durationMinutes: 60,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 3,
      },
    ],
  });

  await db.workingHours.createMany({
    data: [
      { businessId: business.id, dayOfWeek: 0, opensAt: "09:00", closesAt: "20:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 1, opensAt: "09:00", closesAt: "20:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 2, opensAt: "09:00", closesAt: "20:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 3, opensAt: "09:00", closesAt: "20:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 4, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 5, opensAt: "10:00", closesAt: "17:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 6, isClosed: true, opensAt: null, closesAt: null },
    ],
  });

  return { kind: "services", slug, publicUrl: await getPublicBusinessUrlFromRequest(slug) };
}

async function upsertStore(ownerId: string): Promise<FixtureResult> {
  const slug = `qa-v5-store-${ownerId.slice(0, 8)}`;
  const businessType = "متجر إلكتروني";

  const salesTeam = [
    { id: "ts-1", name: "عبدالله السبيعي", title: "مبيعات المتجر", whatsapp: "966555830101", phone: "0555830101", email: "sales1@qa-store.local", visible: true, sortOrder: 0 },
    { id: "ts-2", name: "هند الزهراني", title: "مستشارة منتجات", whatsapp: "966555830102", phone: "0555830102", email: "sales2@qa-store.local", visible: true, sortOrder: 1 },
  ];

  const supportTeam = [
    { id: "tc-1", name: "خالد الدوسري", title: "خدمة العملاء", whatsapp: "966555830201", phone: "0555830201", email: "support1@qa-store.local", visible: true, sortOrder: 0 },
    { id: "tc-2", name: "لمى المطيري", title: "متابعة الطلبات", whatsapp: "966555830202", phone: "0555830202", email: "support2@qa-store.local", visible: true, sortOrder: 1 },
  ];

  const business = await db.business.upsert({
    where: { slug },
    update: {
      ownerId,
      name: "متجر الاختبار - QA V5",
      businessType,
      description: "واجهة متجر خارجي لعرض المنتجات المميزة فقط مع روابط شراء خارجية.",
      shortDescription: "متجر خارجي تجريبي",
      website: "https://store.hee-v5-demo.com",
      city: "الدمام",
      district: "الشاطئ",
      address: "شارع الخليج، مجمع 4",
      googleMapsLink: "https://maps.google.com/?q=26.4207,50.0888",
      whatsapp: "966555300303",
      phone: null,
      logoUrl: fakeLogo("QA Store Logo"),
      coverUrl: fakeCover("QA Store Cover"),
      primaryColor: "#7c3aed",
      buttonStyle: "filled",
      cardStyle: "dark|shadow|lg",
      pageModules: fixturesModules(
        businessType,
        ["products", "externalStore", "inquiry", "location", "about", "contact", "contactTeam"],
        {
          externalStore: { externalStoreUrl: "https://store.hee-v5-demo.com" },
          contact: {
            careersEnabled: true,
            careersExternalUrl: "https://jobs.hee-v5-demo.com",
            careersLabel: "انضم إلى فريقنا",
            businessLinkEnabled: true,
            businessLinkType: "store",
            businessLinkUrl: "https://store.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
        },
      ),
      bookingAvailable: false,
      acceptOnlineOrders: false,
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
    },
    create: {
      ownerId,
      name: "متجر الاختبار - QA V5",
      slug,
      businessType,
      description: "واجهة متجر خارجي لعرض المنتجات المميزة فقط مع روابط شراء خارجية.",
      shortDescription: "متجر خارجي تجريبي",
      website: "https://store.hee-v5-demo.com",
      city: "الدمام",
      district: "الشاطئ",
      address: "شارع الخليج، مجمع 4",
      googleMapsLink: "https://maps.google.com/?q=26.4207,50.0888",
      whatsapp: "966555300303",
      phone: null,
      logoUrl: fakeLogo("QA Store Logo"),
      coverUrl: fakeCover("QA Store Cover"),
      primaryColor: "#7c3aed",
      buttonStyle: "filled",
      cardStyle: "dark|shadow|lg",
      pageModules: fixturesModules(
        businessType,
        ["products", "externalStore", "inquiry", "location", "about", "contact", "contactTeam"],
        {
          externalStore: { externalStoreUrl: "https://store.hee-v5-demo.com" },
          contact: {
            careersEnabled: true,
            careersExternalUrl: "https://jobs.hee-v5-demo.com",
            careersLabel: "انضم إلى فريقنا",
            businessLinkEnabled: true,
            businessLinkType: "store",
            businessLinkUrl: "https://store.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
        },
      ),
      bookingAvailable: false,
      acceptOnlineOrders: false,
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
      onboardingCompleted: true,
    },
  });

  await db.$transaction([
    db.product.deleteMany({ where: { businessId: business.id } }),
    db.offer.deleteMany({ where: { businessId: business.id } }),
  ]);

  const products = await Promise.all([
    db.product.create({
      data: {
        businessId: business.id,
        name: "سماعة لاسلكية",
        description: "صوت نقي وبطارية 24 ساعة",
        unit: "قطعة",
        price: 199,
        oldPrice: 249,
        isActive: true,
        featured: true,
        sortOrder: 0,
      },
    }),
    db.product.create({
      data: {
        businessId: business.id,
        name: "ساعة ذكية",
        description: "تتبع النشاط والنوم",
        unit: "قطعة",
        price: 289,
        oldPrice: null,
        isActive: true,
        featured: true,
        sortOrder: 1,
      },
    }),
    db.product.create({
      data: {
        businessId: business.id,
        name: "شاحن سريع",
        description: "قدرة 45W",
        unit: "قطعة",
        price: 79,
        oldPrice: null,
        isActive: true,
        featured: true,
        sortOrder: 2,
      },
    }),
  ]);

  const productExternalLinks = {
    [products[0].id]: "https://store.hee-v5-demo.com/products/wireless-headset",
    [products[1].id]: "https://store.hee-v5-demo.com/products/smart-watch",
    [products[2].id]: "https://store.hee-v5-demo.com/products/fast-charger",
  };

  await db.business.update({
    where: { id: business.id },
    data: {
      pageModules: fixturesModules(
        businessType,
        ["products", "externalStore", "inquiry", "location", "about", "contact", "contactTeam"],
        {
          externalStore: { externalStoreUrl: "https://store.hee-v5-demo.com" },
          products: {
            featuredProductIds: products.map((product) => product.id),
            productExternalLinks,
          },
          contact: {
            careersEnabled: true,
            careersExternalUrl: "https://jobs.hee-v5-demo.com",
            careersLabel: "انضم إلى فريقنا",
            businessLinkEnabled: true,
            businessLinkType: "store",
            businessLinkUrl: "https://store.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
        },
      ),
    },
  });

  await db.offer.createMany({
    data: [
      {
        businessId: business.id,
        title: "عرض نهاية الأسبوع",
        description: "خصم مباشر على الأجهزة المختارة",
        discountLabel: "حتى 30%",
        isActive: true,
        sortOrder: 0,
      },
      {
        businessId: business.id,
        title: "شحن مجاني",
        description: "شحن مجاني للطلبات فوق 250 ريال",
        discountLabel: "شحن مجاني",
        isActive: true,
        sortOrder: 1,
      },
    ],
  });

  return { kind: "store", slug, publicUrl: await getPublicBusinessUrlFromRequest(slug) };
}

async function upsertLongContent(ownerId: string): Promise<FixtureResult> {
  const slug = `qa-v5-long-${ownerId.slice(0, 8)}`;
  const businessType = "خدمات احترافية للشركات";

  const salesTeam = [
    { id: "ls-1", name: "عبدالرحمن محمد عبدالله الدوسري - Senior Sales Consultant", title: "مدير علاقات العملاء الاستراتيجية", whatsapp: "966555910101", phone: "0555910101", email: "long.sales1@qa.local", visible: true, sortOrder: 0 },
    { id: "ls-2", name: "Laila Al-Harbi ليلى الحربي", title: "Business Development Lead", whatsapp: "966555910102", phone: "0555910102", email: "long.sales2@qa.local", visible: true, sortOrder: 1 },
    { id: "ls-3", name: "فهد بن صالح القحطاني", title: "Enterprise Partnerships", whatsapp: "966555910103", phone: "0555910103", email: "long.sales3@qa.local", visible: true, sortOrder: 2 },
  ];

  const supportTeam = [
    { id: "lc-1", name: "مها عبدالله الزهراني", title: "Customer Success Manager", whatsapp: "966555910201", phone: "0555910201", email: "long.support1@qa.local", visible: true, sortOrder: 0 },
    { id: "lc-2", name: "نورا السبيعي", title: "Support Operations", whatsapp: "966555910202", phone: "0555910202", email: "long.support2@qa.local", visible: true, sortOrder: 1 },
    { id: "lc-3", name: "خالد العتيبي", title: "Technical Support", whatsapp: "966555910203", phone: "0555910203", email: "long.support3@qa.local", visible: true, sortOrder: 2 },
  ];

  const portfolioItems = [
    { id: "lp-1", title: "مشروع التحول الرقمي المتكامل لقطاع الضيافة - Digital Transformation Program", description: "تنفيذ برنامج تحوّل كامل يتضمن الأتمتة والتحليلات ورفع تجربة العميل.", imageUrl: "", url: "https://example.com/very/long/path/for/portfolio/item/one?ref=qa-v5-long-content", visible: true, sortOrder: 0 },
    { id: "lp-2", title: "إعادة هندسة العمليات التشغيلية للمبيعات الميدانية في المنطقة الشرقية", description: "تحسين الأداء وتقليل زمن الاستجابة بنسبة ملحوظة.", imageUrl: "/demo/restaurant-cover.jpg", url: "", visible: true, sortOrder: 1 },
  ];

  const business = await db.business.upsert({
    where: { slug },
    update: {
      ownerId,
      name: "شركة الحلول المتقدمة لإدارة الأعمال والخدمات الرقمية المتكاملة - Advanced Business Solutions Co.",
      businessType,
      description: "هذا وصف طويل لاختبار الثبات البصري وتدفق القراءة في الواجهات العربية، ويحتوي على نصوص ممتدة ومزيج عربي/إنجليزي للتأكد من سلامة الاتجاهات وعدم القص على الهواتف المختلفة.",
      shortDescription: "حلول رقمية وتشغيلية للشركات",
      city: "الرياض",
      district: "حي الصحافة",
      address: "طريق الملك فهد، برج الأعمال، الدور 18، مكتب 1802",
      googleMapsLink: "https://maps.google.com/?q=24.7420,46.6520",
      whatsapp: "966555910000",
      phone: "0555910000",
      website: "https://solutions.hee-v5-demo.com/about/our-services-and-solutions-for-enterprise-customers",
      logoUrl: "",
      coverUrl: "",
      primaryColor: "#0f766e",
      buttonStyle: "soft",
      cardStyle: "light|bordered|md",
      pageModules: fixturesModules(
        businessType,
        ["services", "request", "inquiry", "location", "hours", "about", "contact", "contactTeam", "portfolio"],
        {
          services: { title: "خدماتنا المتخصصة" },
          contact: {
            careersEnabled: true,
            careersEmail: "careers.long@hee-qa.local",
            careersLabel: "الوظائف",
            businessLinkEnabled: true,
            businessLinkType: "website",
            businessLinkUrl: "https://solutions.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
          portfolio: { title: "أعمالنا", portfolioItems },
        },
      ),
      bookingAvailable: true,
      acceptOnlineOrders: false,
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
    },
    create: {
      ownerId,
      name: "شركة الحلول المتقدمة لإدارة الأعمال والخدمات الرقمية المتكاملة - Advanced Business Solutions Co.",
      slug,
      businessType,
      description: "هذا وصف طويل لاختبار الثبات البصري وتدفق القراءة في الواجهات العربية، ويحتوي على نصوص ممتدة ومزيج عربي/إنجليزي للتأكد من سلامة الاتجاهات وعدم القص على الهواتف المختلفة.",
      shortDescription: "حلول رقمية وتشغيلية للشركات",
      city: "الرياض",
      district: "حي الصحافة",
      address: "طريق الملك فهد، برج الأعمال، الدور 18، مكتب 1802",
      googleMapsLink: "https://maps.google.com/?q=24.7420,46.6520",
      whatsapp: "966555910000",
      phone: "0555910000",
      website: "https://solutions.hee-v5-demo.com/about/our-services-and-solutions-for-enterprise-customers",
      logoUrl: "",
      coverUrl: "",
      primaryColor: "#0f766e",
      buttonStyle: "soft",
      cardStyle: "light|bordered|md",
      pageModules: fixturesModules(
        businessType,
        ["services", "request", "inquiry", "location", "hours", "about", "contact", "contactTeam", "portfolio"],
        {
          services: { title: "خدماتنا المتخصصة" },
          contact: {
            careersEnabled: true,
            careersEmail: "careers.long@hee-qa.local",
            careersLabel: "الوظائف",
            businessLinkEnabled: true,
            businessLinkType: "website",
            businessLinkUrl: "https://solutions.hee-v5-demo.com",
          },
          contactTeam: { salesTeam, customerServiceTeam: supportTeam },
          portfolio: { title: "أعمالنا", portfolioItems },
        },
      ),
      bookingAvailable: true,
      acceptOnlineOrders: false,
      isPublished: true,
      publishedAt: new Date(),
      isVerified: true,
      onboardingCompleted: true,
    },
  });

  await db.$transaction([
    db.service.deleteMany({ where: { businessId: business.id } }),
    db.workingHours.deleteMany({ where: { businessId: business.id } }),
  ]);

  await db.service.createMany({
    data: [
      { businessId: business.id, name: "خدمة استشارية متقدمة لإدارة الأداء المؤسسي والتحول التشغيلي", description: "خطة مفصلة مع مؤشرات أداء واضحة.", price: 1200, durationMinutes: 90, bookingEnabled: true, isActive: true, sortOrder: 0 },
      { businessId: business.id, name: "Enterprise Operational Excellence Program", description: "برنامج شامل لتحسين الكفاءة التشغيلية.", price: 1900, durationMinutes: 120, bookingEnabled: true, isActive: true, sortOrder: 1 },
    ],
  });

  await db.workingHours.createMany({
    data: [
      { businessId: business.id, dayOfWeek: 0, opensAt: "08:30", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 1, opensAt: "08:30", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 2, opensAt: "08:30", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 3, opensAt: "08:30", closesAt: "18:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 4, opensAt: "08:30", closesAt: "16:00", isClosed: false },
      { businessId: business.id, dayOfWeek: 5, isClosed: true, opensAt: null, closesAt: null },
      { businessId: business.id, dayOfWeek: 6, isClosed: true, opensAt: null, closesAt: null },
    ],
  });

  return { kind: "long-content", slug, publicUrl: await getPublicBusinessUrlFromRequest(slug) };
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

  const owner = await ensureFixtureOwner();
  if (!owner) {
    return NextResponse.json({ error: "تعذر تجهيز مستخدم QA" }, { status: 500 });
  }

  const [restaurant, services, store, longContent] = await Promise.all([
    upsertRestaurant(owner.id),
    upsertServices(owner.id),
    upsertStore(owner.id),
    upsertLongContent(owner.id),
  ]);

  return NextResponse.json(
    {
      previewOnly: true,
      fixtures: {
        restaurant,
        services,
        store,
        longContent,
      },
    },
    { status: 200 },
  );
}
