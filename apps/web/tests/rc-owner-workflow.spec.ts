import dotenv from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { getDefaultPageModules, serializePageModules, type PageModuleState } from "../app/lib/page-modules";

dotenv.config({ path: ".env.local" });

type DbClient = PrismaClient;

type SeededBusiness = {
  userId: string;
  sessionToken: string;
  businessId: string;
  slug: string;
  publicUrl: string;
  dashboardUrl: string;
  snapshot: {
    serviceCount: number;
    openingHoursCount: number;
    socialLinkCount: number;
    contactTeamSalesCount: number;
    contactTeamSupportCount: number;
    portfolioCount: number;
  };
};

type BusinessSnapshot = {
  name: string;
  shortDescription: string | null;
  primaryColor: string;
  buttonStyle: string | null;
  cardStyle: string | null;
  isPublished: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  pageModules: PageModuleState[];
  services: Array<{ id: string; name: string; price: number }>;
  openingHours: Array<{ dayOfWeek: number; opensAt: string | null; closesAt: string | null; isClosed: boolean }>;
  socialLinks: Array<{ platform: string; url: string }>;
};

let db: DbClient | null = null;
let pool: Pool | null = null;

const baseUrl = "http://127.0.0.1:3000";
const mobileViewports = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
];
const desktopViewports = [
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x900", width: 1280, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
];

const png1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5X0i8AAAAASUVORK5CYII=",
  "base64",
);
const pdfBuffer = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF",
  "utf8",
);

function requireDb() {
  if (!db) {
    throw new Error("Prisma client not initialized");
  }

  return db;
}

function makeModules() {
  const salesTeam = [
    { id: "sales-1", name: "سلمان الحربي", title: "مبيعات", whatsapp: "966555880101", phone: "0555880101", email: "sales1@hee.local", visible: true, sortOrder: 0 },
    { id: "sales-2", name: "ريم الشمري", title: "تنسيق", whatsapp: "966555880102", phone: "0555880102", email: "sales2@hee.local", visible: true, sortOrder: 1 },
    { id: "sales-3", name: "تركي العتيبي", title: "حجوزات", whatsapp: "966555880103", phone: "0555880103", email: "sales3@hee.local", visible: true, sortOrder: 2 },
    { id: "sales-4", name: "نورة الدوسري", title: "عروض الشركات", whatsapp: "966555880104", phone: "0555880104", email: "sales4@hee.local", visible: true, sortOrder: 3 },
  ];

  const customerServiceTeam = [
    { id: "support-1", name: "مي الغامدي", title: "خدمة العملاء", whatsapp: "966555880201", phone: "0555880201", email: "support1@hee.local", visible: true, sortOrder: 0 },
    { id: "support-2", name: "هشام القرني", title: "الدعم الفني", whatsapp: "966555880202", phone: "0555880202", email: "support2@hee.local", visible: true, sortOrder: 1 },
    { id: "support-3", name: "رنا القحطاني", title: "المتابعة", whatsapp: "966555880203", phone: "0555880203", email: "support3@hee.local", visible: true, sortOrder: 2 },
    { id: "support-4", name: "جود المطيري", title: "ما بعد البيع", whatsapp: "966555880204", phone: "0555880204", email: "support4@hee.local", visible: true, sortOrder: 3 },
  ];

  const portfolioItems = Array.from({ length: 7 }, (_, index) => ({
    id: `portfolio-${index + 1}`,
    title: `مشروع رقم ${index + 1}`,
    description: `وصف مختصر للمشروع ${index + 1}`,
    imageUrl: `https://dummyimage.com/1200x800/e8eeff/1f2552&text=${encodeURIComponent(`Project ${index + 1}`)}`,
    url: `https://example.com/projects/${index + 1}`,
    ctaLabel: "تفاصيل المشروع",
    visible: true,
    sortOrder: index,
  }));

  const modules: PageModuleState[] = getDefaultPageModules("خدمات منزلية").map((module): PageModuleState => {
    if (module.id === "services") {
      return {
        ...module,
        enabled: true,
        config: {
          ...module.config,
          title: "خدماتنا",
        },
      };
    }

    if (module.id === "contact") {
      return {
        ...module,
        enabled: true,
        config: {
          ...module.config,
          businessLinkEnabled: true,
          businessLinkType: "website",
          businessLinkUrl: "https://services.example.com",
          businessLinkLabel: "الموقع الإلكتروني",
        },
      };
    }

    if (module.id === "contactTeam") {
      return {
        ...module,
        enabled: true,
        config: {
          ...module.config,
          salesTeam,
          customerServiceTeam,
        },
      };
    }

    if (module.id === "portfolio") {
      return {
        ...module,
        enabled: true,
        config: {
          ...module.config,
          title: "أعمالنا",
          portfolioItems,
        },
      };
    }

    if (module.id === "companyProfile") {
      return {
        ...module,
        enabled: true,
        config: {
          ...module.config,
          companyProfile: {
            title: "الملف التعريفي",
            description: "ملف تعريفي للاختبار قبل رفع PDF جديد من المحرر.",
            ctaLabel: "عرض الملف التعريفي",
            pdfUrl: "https://example.com/profile.pdf",
            pdfStorageKey: "seeded-profile",
            pdfFileName: "seeded-profile.pdf",
            pdfFileSize: 1024,
            visible: true,
          },
        },
      };
    }

    return module;
  });

  return { modules, salesTeam, customerServiceTeam, portfolioItems };
}

async function seedBusiness(): Promise<SeededBusiness> {
  const dbClient = requireDb();
  const seeded = makeModules();
  const slug = `rc-workflow-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const userEmail = `${slug}@hee.local`;
  const passwordHash = await hash("Aa!123456", 10);

  const user = await dbClient.user.create({
    data: {
      name: "RC Workflow User",
      email: userEmail,
      passwordHash,
    },
  });

  const sessionToken = crypto.randomUUID();
  await dbClient.session.create({
    data: {
      token: sessionToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const business = await dbClient.business.create({
    data: {
      ownerId: user.id,
      slug,
      name: "خدمات الخزامى التنفيذية",
      businessType: "خدمات منزلية",
      description: "خدمات صيانة وتنفيذ ومتابعة ميدانية مع دعم مباشر عبر واتساب.",
      shortDescription: "خدمات منزلية سريعة وواضحة",
      country: "السعودية",
      city: "الرياض",
      district: "العليا",
      address: "طريق العليا العام، مبنى 12",
      googleMapsLink: "https://maps.google.com/?q=24.7136,46.6753",
      whatsapp: "966555330011",
      phone: "0555330011",
      website: "https://services.example.com",
      primaryColor: "#5D43EF",
      secondaryColor: "#10213f",
      buttonColor: "#4F46E5",
      buttonStyle: "rounded",
      cardStyle: "glass",
      pageModules: serializePageModules(seeded.modules),
      bookingAvailable: true,
      onboardingCompleted: true,
      onboardingStep: "published",
      isVerified: true,
      isPublished: false,
    },
  });

  await dbClient.service.createMany({
    data: [
      {
        businessId: business.id,
        name: "صيانة عاجلة",
        description: "زيارة فورية خلال نفس اليوم",
        price: 180,
        durationMinutes: 60,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 0,
      },
      {
        businessId: business.id,
        name: "تركيب وتجهيز",
        description: "تركيب احترافي مع متابعة",
        price: 240,
        durationMinutes: 120,
        bookingEnabled: true,
        isActive: true,
        sortOrder: 1,
      },
    ],
  });

  await dbClient.offer.createMany({
    data: [
      {
        businessId: business.id,
        title: "عرض الصيانة الشهرية",
        description: "خصم للعملاء الجدد",
        discountLabel: "خصم 15%",
        isActive: true,
        sortOrder: 0,
      },
      {
        businessId: business.id,
        title: "باقة التنفيذ الكامل",
        description: "تنفيذ شامل للمشروع الصغير",
        discountLabel: "باقة",
        isActive: true,
        sortOrder: 1,
      },
    ],
  });

  await dbClient.workingHours.createMany({
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

  await dbClient.socialLink.create({
    data: {
      businessId: business.id,
      platform: "Instagram",
      url: "https://instagram.com/hee-workflow",
      isActive: true,
    },
  });

  const snapshot = await dbClient.business.findUnique({
    where: { id: business.id },
    include: {
      services: true,
      openingHours: true,
      socialLinks: true,
    },
  });

  if (!snapshot) {
    throw new Error("Failed to seed workflow business");
  }

  const modules = snapshot.pageModules as PageModuleState[];
  const contactTeam = modules.find((module) => module.id === "contactTeam")?.config ?? {};
  const portfolio = modules.find((module) => module.id === "portfolio")?.config ?? {};

  return {
    userId: user.id,
    sessionToken,
    businessId: business.id,
    slug: business.slug,
    publicUrl: `${baseUrl}/b/${business.slug}`,
    dashboardUrl: `${baseUrl}/dashboard/my-page?edit=1`,
    snapshot: {
      serviceCount: snapshot.services.length,
      openingHoursCount: snapshot.openingHours.length,
      socialLinkCount: snapshot.socialLinks.length,
      contactTeamSalesCount: Array.isArray(contactTeam.salesTeam) ? contactTeam.salesTeam.length : 0,
      contactTeamSupportCount: Array.isArray(contactTeam.customerServiceTeam) ? contactTeam.customerServiceTeam.length : 0,
      portfolioCount: Array.isArray(portfolio.portfolioItems) ? portfolio.portfolioItems.length : 0,
    },
  };
}

async function readSnapshot(businessId: string): Promise<BusinessSnapshot> {
  const dbClient = requireDb();
  const business = await dbClient.business.findUnique({
    where: { id: businessId },
    include: {
      services: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      openingHours: { orderBy: [{ dayOfWeek: "asc" }] },
      socialLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  return {
    name: business.name,
    shortDescription: business.shortDescription,
    primaryColor: business.primaryColor,
    buttonStyle: business.buttonStyle,
    cardStyle: business.cardStyle,
    isPublished: business.isPublished,
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl,
    pageModules: (business.pageModules as PageModuleState[]) ?? [],
    services: business.services.map((service) => ({ id: service.id, name: service.name, price: service.price })),
    openingHours: business.openingHours.map((item) => ({ dayOfWeek: item.dayOfWeek, opensAt: item.opensAt, closesAt: item.closesAt, isClosed: item.isClosed })),
    socialLinks: business.socialLinks.map((item) => ({ platform: item.platform, url: item.url })),
  };
}

async function setSessionCookie(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: "hee_session",
      value: token,
      url: baseUrl,
    },
  ]);
}

async function openWithConsoleGuard(page: Page, url: string) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("body").waitFor({ state: "visible" });
  return consoleErrors;
}

test.describe.serial("RC owner workflow", () => {
  test.beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/hee";
    pool = new Pool({ connectionString });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    const dbClient = db;
    db = null;
    if (dbClient) {
      await dbClient.$disconnect();
    }
    if (pool) {
      await pool.end();
      pool = null;
    }
  });

  test("covers edit, preview, publish, persistence, and responsive rendering", async ({ browser }) => {
    test.slow();
    test.setTimeout(180000);

    const stage = async <T>(label: string, task: () => Promise<T>) => {
      const started = Date.now();
      console.log(`[RC-STAGE] START ${label} at ${new Date(started).toISOString()}`);
      try {
        const result = await task();
        console.log(`[RC-STAGE] DONE ${label} in ${Date.now() - started}ms`);
        return result;
      } catch (error) {
        console.error(`[RC-STAGE] ERROR ${label} after ${Date.now() - started}ms`, error);
        throw error;
      }
    };

    const seeded = await stage("seedBusiness", () => seedBusiness());

    try {
      const before = await stage("readSnapshot-before", async () => readSnapshot(seeded.businessId));
      expect(before.services).toHaveLength(seeded.snapshot.serviceCount);
      expect(before.openingHours).toHaveLength(seeded.snapshot.openingHoursCount);
      expect(before.socialLinks).toHaveLength(seeded.snapshot.socialLinkCount);
      expect((before.pageModules.find((module) => module.id === "contactTeam")?.config.salesTeam as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.contactTeamSalesCount);
      expect((before.pageModules.find((module) => module.id === "contactTeam")?.config.customerServiceTeam as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.contactTeamSupportCount);
      expect((before.pageModules.find((module) => module.id === "portfolio")?.config.portfolioItems as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.portfolioCount);

      const desktopPage = await stage("browser.newPage", async () => browser.newPage({ viewport: { width: 1440, height: 900 } }));
      await setSessionCookie(desktopPage, seeded.sessionToken);

      const editorErrors = await stage("open page-builder", async () => openWithConsoleGuard(desktopPage, `${baseUrl}/dashboard/page-builder`));
      await expect(desktopPage.getByRole("heading", { name: "هوية النشاط" })).toBeVisible();
      await expect(desktopPage.getByRole("button", { name: "1. هوية النشاط" })).toBeVisible();

      await stage("identity-form", async () => {
        await desktopPage.getByRole("button", { name: "1. هوية النشاط" }).click();
        await desktopPage.getByLabel("اسم النشاط").fill("خدمات الخزامى التنفيذية - RC");
        await desktopPage.getByLabel("وصف مختصر").fill("خدمات منزلية احترافية مع معاينة ونشر مباشر");
        await desktopPage.getByLabel("وصف كامل").fill("خدمات منزلية احترافية مع معاينة ونشر مباشر، مع فريق دعم، ساعات عمل واضحة، ومحتوى منشور جاهز لاستقبال العملاء عبر الصفحات والطلبات.");
        await desktopPage.locator('input[name="logoFile"]').setInputFiles({ name: "rc-logo.png", mimeType: "image/png", buffer: png1x1 });
        await desktopPage.locator('input[name="coverFile"]').setInputFiles({ name: "rc-cover.png", mimeType: "image/png", buffer: png1x1 });

        const saveIdentityRequest = desktopPage.waitForResponse(
          (response) => response.request().method() === "POST" && response.url().includes("/dashboard/page-builder") && response.status() >= 200,
          { timeout: 30000 },
        );

        await desktopPage.getByRole("button", { name: "حفظ الهوية" }).click();
        await saveIdentityRequest;
        await expect.poll(async () => (await readSnapshot(seeded.businessId)).name, { timeout: 15000 }).toBe("خدمات الخزامى التنفيذية - RC");
        await expect(desktopPage.getByLabel("اسم النشاط")).toHaveValue("خدمات الخزامى التنفيذية - RC", { timeout: 15000 });
      });

      await stage("identity-reload", async () => {
        await desktopPage.reload({ waitUntil: "domcontentloaded" });
        await expect(desktopPage.getByLabel("اسم النشاط")).toHaveValue("خدمات الخزامى التنفيذية - RC", { timeout: 15000 });
      });

      await stage("branding-save", async () => {
        await desktopPage.getByRole("button", { name: "10. الهوية البصرية" }).click();
        await desktopPage.getByLabel("اللون الأساسي").fill("#0EA5E9");
        await desktopPage.getByLabel("نمط الأزرار").selectOption("pill");
        await desktopPage.getByLabel("نمط البطاقات").selectOption("elevated");

        const saveBrandingRequest = desktopPage.waitForResponse(
          (response) => response.request().method() === "POST" && response.url().includes("/dashboard/page-builder") && response.status() >= 200,
          { timeout: 30000 },
        );

        await desktopPage.getByRole("button", { name: "حفظ الهوية البصرية" }).click();
        await saveBrandingRequest;
        await expect.poll(async () => (await readSnapshot(seeded.businessId)).primaryColor.toLowerCase(), { timeout: 15000 }).toBe("#0ea5e9");
        await expect(desktopPage.getByRole("button", { name: "حفظ الهوية البصرية" })).toBeVisible();
      });

      await stage("review-publish", async () => {
        await desktopPage.reload({ waitUntil: "domcontentloaded" });
        await desktopPage.getByRole("button", { name: "11. المراجعة" }).click();

        await expect(desktopPage.getByRole("button", { name: "نشر الصفحة" })).toBeVisible({ timeout: 15000 });
        await desktopPage.getByRole("button", { name: "نشر الصفحة" }).click({ force: true });

        await expect(desktopPage.locator("body")).toContainText(/مبروك.*استقبال العملاء|تم حفظ التعديلات|تم حفظ.*منشورة|جاري النشر/i, { timeout: 30000 });
      });

      await stage("my-page-company-profile", async () => {
        await desktopPage.goto(`${baseUrl}/dashboard/my-page?edit=1`, { waitUntil: "domcontentloaded" });
        await expect(desktopPage.getByText("محتوى صفحتك")).toBeVisible();

        await desktopPage.getByText("الملف التعريفي", { exact: true }).click();
        const pdfInput = desktopPage.locator('input[type="file"][accept="application/pdf,.pdf"]');
        await pdfInput.setInputFiles({ name: "rc-profile.pdf", mimeType: "application/pdf", buffer: pdfBuffer });

        await expect.poll(async () => {
          const snapshot = await readSnapshot(seeded.businessId);
          const companyProfile = snapshot.pageModules.find((module) => module.id === "companyProfile")?.config.companyProfile as { pdfFileName?: string; pdfUrl?: string } | undefined;
          return Boolean(companyProfile?.pdfFileName && /rc-profile\.pdf/i.test(companyProfile.pdfFileName));
        }, { timeout: 20000 }).toBe(true);

        await expect(desktopPage.getByText(/rc-profile\.pdf/i).first()).toBeVisible({ timeout: 15000 });
      });

      await stage("module-reorder", async () => {
        const moduleMenuButtons = desktopPage.locator('button[aria-label="إجراءات القسم"]');
        const menuCount = await moduleMenuButtons.count();
        await moduleMenuButtons.nth(menuCount - 2).click();
        await desktopPage.getByRole("button", { name: "تحريك لأعلى" }).click();
        await expect(desktopPage.locator("body")).toContainText(/تم حفظ التعديلات|تم الحفظ|جاري الحفظ|جارٍ الحفظ/i, { timeout: 15000 });

        await desktopPage.reload({ waitUntil: "domcontentloaded" });
        await expect.poll(async () => {
          const snapshot = await readSnapshot(seeded.businessId);
          const companyProfile = snapshot.pageModules.find((module) => module.id === "companyProfile")?.config.companyProfile as { pdfFileName?: string; pdfUrl?: string } | undefined;
          return Boolean(companyProfile?.pdfFileName && /rc-profile\.pdf/i.test(companyProfile.pdfFileName) && companyProfile.pdfUrl?.startsWith("/api/storage/"));
        }, { timeout: 20000 }).toBe(true);
        await expect(desktopPage.getByText(/rc-profile\.pdf/i).first()).toBeVisible({ timeout: 15000 });
        await expect(desktopPage.getByRole("heading", { name: "خدمات الخزامى التنفيذية - RC" })).toBeVisible();
      });

      const after = await stage("readSnapshot-after", async () => readSnapshot(seeded.businessId));
      expect(after.services).toHaveLength(before.services.length);
      expect(after.openingHours).toHaveLength(before.openingHours.length);
      expect(after.socialLinks).toHaveLength(before.socialLinks.length);
      expect((after.pageModules.find((module) => module.id === "contactTeam")?.config.salesTeam as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.contactTeamSalesCount);
      expect((after.pageModules.find((module) => module.id === "contactTeam")?.config.customerServiceTeam as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.contactTeamSupportCount);
      expect((after.pageModules.find((module) => module.id === "portfolio")?.config.portfolioItems as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.portfolioCount);
      expect(after.logoUrl ?? "").toMatch(/^\/(uploads\/|api\/storage\/)/);
      expect(after.coverUrl ?? "").toMatch(/^\/(uploads\/|api\/storage\/)/);
      expect(after.primaryColor.toLowerCase()).toBe("#0ea5e9");
      expect(after.isPublished).toBe(true);

      await stage("public-page", async () => {
        await desktopPage.goto(seeded.publicUrl, { waitUntil: "domcontentloaded" });
        await desktopPage.locator("body").waitFor({ state: "visible" });

        await expect(desktopPage.getByRole("heading", { name: /خدمات الخزامى التنفيذية - RC/i })).toBeVisible();
        await expect(desktopPage.getByRole("heading", { name: /فريق التواصل|معلومات التواصل/i })).toBeVisible();
        await expect(desktopPage.getByRole("heading", { name: /أعمالنا|معرض الأعمال/i })).toBeVisible();
        await expect(desktopPage.getByRole("heading", { name: /الملف التعريفي|ملف تعريفي/i })).toBeVisible();
        await expect(desktopPage.locator('a[href*="/api/storage/"]')).toBeVisible();
        await expect(desktopPage.locator('img[alt="غلاف النشاط"]')).toBeVisible();
        await expect(desktopPage.locator(`img[alt="خدمات الخزامى التنفيذية - RC"]`)).toBeVisible();

        const accentColor = await desktopPage.locator("main").evaluate((element) => getComputedStyle(element).getPropertyValue("--hee-accent").trim());
        expect(accentColor.toLowerCase()).toBe("#0ea5e9");

        const contactTeamBox = await desktopPage.locator("#contact-team-section").boundingBox();
        const portfolioBox = await desktopPage.locator("#portfolio-section").boundingBox();
        const companyProfileBox = await desktopPage.locator("#company-profile-section").boundingBox();
        expect(contactTeamBox).not.toBeNull();
        expect(portfolioBox).not.toBeNull();
        expect(companyProfileBox).not.toBeNull();
        if (contactTeamBox && portfolioBox && companyProfileBox) {
          expect(companyProfileBox.y).toBeLessThan(portfolioBox.y);
          expect(portfolioBox.y).toBeLessThan(contactTeamBox.y);
        }
      });

      await stage("responsive-public", async () => {
        const responsiveTargets = [...mobileViewports, ...desktopViewports];
        for (const viewport of responsiveTargets) {
          const publicPage = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
          await setSessionCookie(publicPage, seeded.sessionToken);

          const publicErrors = await openWithConsoleGuard(publicPage, seeded.publicUrl);
          await expect(publicPage.getByRole("heading", { name: /خدمات الخزامى التنفيذية - RC/i })).toBeVisible();
          await expect(publicPage.getByRole("heading", { name: /فريق التواصل|معلومات التواصل/i })).toBeVisible();
          expect(publicErrors).toEqual([]);

          await publicPage.goto(`${baseUrl}/dashboard/my-page?edit=1`, { waitUntil: "domcontentloaded" });
          await expect(publicPage.getByText("محتوى صفحتك")).toBeVisible();
          if (viewport.width < 1024) {
            await expect(publicPage.getByRole("button", { name: "معاينة صفحتي" })).toBeVisible();
          } else {
            await expect(publicPage.getByText("معاينة صفحتك")).toBeVisible();
          }

          await publicPage.close();
        }
      });

      expect(editorErrors).toEqual([]);
      await desktopPage.close();
    } finally {
      const dbClient = db;
      if (!dbClient) {
        return;
      }

      await dbClient.socialLink.deleteMany({ where: { businessId: seeded.businessId } });
      await dbClient.workingHours.deleteMany({ where: { businessId: seeded.businessId } });
      await dbClient.offer.deleteMany({ where: { businessId: seeded.businessId } });
      await dbClient.service.deleteMany({ where: { businessId: seeded.businessId } });
      await dbClient.business.delete({ where: { id: seeded.businessId } });
      await dbClient.session.deleteMany({ where: { token: seeded.sessionToken } });
      await dbClient.user.delete({ where: { id: seeded.userId } });
    }
  });
});