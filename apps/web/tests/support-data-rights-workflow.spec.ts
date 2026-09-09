import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";
let db: PrismaClient;

async function setSession(page: import("@playwright/test").Page, token: string) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

test.describe.serial("customer support and data rights", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required");
    db = new PrismaClient({ datasourceUrl: connectionString });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
  });

  test("owner can open support, export own data, and admin can resolve the ticket", async ({ page }) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: { isActive: true }, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true } });
    const owner = await db.user.create({ data: { name: "Support RC Owner", email: `support-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
    const business = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: "منشأة دعم الاختبار", slug: `support-rc-${suffix}`, businessType: "خدمات", onboardingCompleted: true } });
    await db.service.create({ data: { businessId: business.id, name: "خدمة دعم تجريبية", price: 100 } });
    const ownerToken = crypto.randomUUID();
    await db.session.create({ data: { token: ownerToken, userId: owner.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

    const admin = await db.user.upsert({ where: { email: adminEmail }, update: { name: "RC Platform Admin", deletedAt: null, emailVerifiedAt: new Date() }, create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
    const adminToken = crypto.randomUUID();
    await db.session.create({ data: { token: adminToken, userId: admin.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

    try {
      await setSession(page, ownerToken);
      await page.goto(`${baseUrl}/dashboard/support`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#dashboard-main-content").getByRole("heading", { name: "الدعم والمساعدة" })).toBeVisible();
      await page.locator('select[name="category"]').selectOption("technical");
      await page.getByPlaceholder("صف المشكلة باختصار").fill("مشكلة اختبار الدعم");
      await page.getByPlaceholder(/اذكر التفاصيل/).fill("تفاصيل فنية لاختبار مسار دعم العميل وربط الطلب بالمنشأة الصحيحة.");
      await page.getByRole("button", { name: "إرسال الطلب" }).click();
      await expect(page).toHaveURL(/sent=1/);
      await expect(page.getByText("مشكلة اختبار الدعم")).toBeVisible();

      const supportEvent = await db.analyticsEvent.findFirstOrThrow({ where: { businessId: business.id, eventType: "support_requested" }, orderBy: { createdAt: "desc" } });
      expect((supportEvent.metadata as { requestedByUserId?: string }).requestedByUserId).toBe(owner.id);

      const exportResponse = await page.request.get(`${baseUrl}/api/dashboard/export`);
      expect(exportResponse.status()).toBe(200);
      expect(exportResponse.headers()["cache-control"]).toContain("no-store");
      expect(exportResponse.headers()["content-disposition"]).toContain("attachment");
      const exported = await exportResponse.json() as { account: { id: string; email: string }; business: { id: string; slug: string }; services: Array<{ name: string }> };
      expect(exported.account.id).toBe(owner.id);
      expect(exported.account.email).toBe(owner.email);
      expect(exported.business.id).toBe(business.id);
      expect(exported.services.some((service) => service.name === "خدمة دعم تجريبية")).toBe(true);

      await setSession(page, adminToken);
      await page.goto(`${baseUrl}/admin/support`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "دعم العملاء" })).toBeVisible();
      const ticket = page.locator("article").filter({ hasText: "مشكلة اختبار الدعم" });
      await expect(ticket).toContainText("منشأة دعم الاختبار");
      const resolutionNote = "تم التحقق من طلب الاختبار ومعالجته وإبلاغ العميل بالنتيجة.";
      await ticket.getByRole("textbox", { name: "الرد النهائي للعميل" }).fill(resolutionNote);
      await ticket.getByRole("button", { name: "حفظ وإغلاق الطلب" }).click();
      await expect(page).toHaveURL(/done=resolved/);

      await setSession(page, ownerToken);
      await page.goto(`${baseUrl}/dashboard/support`, { waitUntil: "domcontentloaded" });
      const ownerTicket = page.locator("article").filter({ hasText: "مشكلة اختبار الدعم" });
      await expect(ownerTicket.getByText("تمت المعالجة")).toBeVisible();
      await expect(ownerTicket.getByText(resolutionNote)).toBeVisible();
    } finally {
      await db.analyticsEvent.deleteMany({ where: { businessId: business.id } });
      await db.service.deleteMany({ where: { businessId: business.id } });
      await db.business.delete({ where: { id: business.id } });
      await db.session.deleteMany({ where: { userId: { in: [owner.id, admin.id] } } });
      await db.authIdentity.deleteMany({ where: { userId: owner.id } });
      await db.user.delete({ where: { id: owner.id } });
      const adminBusinesses = await db.business.count({ where: { ownerId: admin.id } });
      if (adminBusinesses === 0) await db.user.delete({ where: { id: admin.id } }).catch(() => undefined);
    }
  });
});
