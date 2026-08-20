import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

test.describe.serial("HEE directory workflow", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for directory workflow");
    pool = new Pool({ connectionString, max: 3 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("owner can create a branch and team member and see both on V10", async ({ page }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const plan = await db.businessPlan.upsert({
      where: { code: "FREE" },
      update: { isActive: true },
      create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
    });
    const user = await db.user.create({ data: { name: "Directory RC Owner", email: `directory-${suffix}@hee.test`, passwordHash: "rc-only" } });
    const slug = `directory-rc-${suffix}`;
    const business = await db.business.create({
      data: {
        ownerId: user.id,
        planId: plan.id,
        name: "شركة دليل الاختبار",
        slug,
        businessType: "خدمات أعمال",
        shortDescription: "اختبار الفروع وفريق التواصل",
        city: "جدة",
        whatsapp: "966500000001",
        phone: "0500000001",
        onboardingCompleted: true,
        isPublished: true,
      },
    });
    const token = crypto.randomUUID();
    await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

    try {
      await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
      await page.goto(`${baseUrl}/dashboard/directory`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "الفروع والفريق" })).toBeVisible();

      await page.getByPlaceholder("اسم الفرع").fill("فرع جدة الرئيسي");
      await page.getByPlaceholder("المدينة").fill("جدة");
      await page.getByPlaceholder("الحي").fill("الروضة");
      await page.getByPlaceholder("هاتف الفرع (اختياري)").fill("0500000011");
      await page.getByPlaceholder("واتساب الفرع (اختياري)").fill("966500000011");
      await page.getByRole("button", { name: "إضافة فرع" }).click();
      await expect(page).toHaveURL(/status=branch-created/);
      await expect(page.getByText("تمت إضافة الفرع.")).toBeVisible();

      const branch = await db.branch.findFirstOrThrow({ where: { businessId: business.id } });
      expect(branch.name).toBe("فرع جدة الرئيسي");
      expect(branch.isMain).toBe(true);

      await page.getByPlaceholder("الاسم").fill("مسؤول مبيعات جدة");
      await page.getByPlaceholder("المسمى الوظيفي").fill("مسؤول مبيعات");
      await page.getByPlaceholder("واتساب").fill("966500000022");
      await page.getByPlaceholder("الهاتف (اختياري)").fill("0500000022");
      await page.locator('select[name="branchId"]').first().selectOption(branch.id);
      await page.getByPlaceholder("البريد (اختياري)").fill("sales-directory@hee.test");
      await page.getByRole("button", { name: "إضافة عضو" }).click();
      await expect(page).toHaveURL(/status=contact-created/);
      await expect(page.getByText("تمت إضافة عضو الفريق.")).toBeVisible();

      const contact = await db.contactPerson.findFirstOrThrow({ where: { businessId: business.id } });
      expect(contact.branchId).toBe(branch.id);
      expect(contact.isPrimary).toBe(true);

      await page.goto(`${baseUrl}/${slug}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "شركة دليل الاختبار" })).toBeVisible();
      await page.getByRole("button", { name: /فروعنا/ }).click();
      await expect(page.getByText("فرع جدة الرئيسي")).toBeVisible();
      await page.getByRole("button", { name: /فريق العمل/ }).click();
      await expect(page.getByText("مسؤول مبيعات جدة")).toBeVisible();
      await expect(page.getByText("مسؤول مبيعات", { exact: true })).toBeVisible();
    } finally {
      // Stop the public page before deleting its test fixture. The page can emit analytics
      // asynchronously; leaving it open creates a race where a fresh event appears between
      // deleteMany() and the RESTRICT-protected Business delete.
      if (!page.isClosed()) await page.close();
      await db.analyticsEvent.deleteMany({ where: { businessId: business.id } });
      await db.contactPerson.deleteMany({ where: { businessId: business.id } });
      await db.branch.deleteMany({ where: { businessId: business.id } });
      await db.business.delete({ where: { id: business.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  });
});