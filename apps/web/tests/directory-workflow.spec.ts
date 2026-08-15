import dotenv from "dotenv";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool | null = null;
let db: PrismaClient | null = null;

function client() {
  if (!db) throw new Error("Prisma client not initialized");
  return db;
}

test.describe.serial("HEE V3 directory workflow", () => {
  test.beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/hee";
    pool = new Pool({ connectionString });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    if (db) await db.$disconnect();
    if (pool) await pool.end();
    db = null;
    pool = null;
  });

  test("owner can build a real branch, department and contact directory and publish it", async ({ page }) => {
    const prisma = client();
    const slug = `directory-rc-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
    const user = await prisma.user.create({
      data: {
        name: "Directory RC Owner",
        email: `${slug}@hee.local`,
        passwordHash: await hash("Aa!123456", 10),
      },
    });

    const business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: "شركة دليل الاختبار",
        slug,
        businessType: "خدمات",
        description: "نشاط اختبار لمسار الفروع والأقسام وجهات الاتصال.",
        shortDescription: "اختبار دليل التواصل الحقيقي",
        city: "جدة",
        whatsapp: "966500000001",
        phone: "0500000001",
        onboardingCompleted: true,
        isPublished: true,
      },
    });

    const token = crypto.randomUUID();
    await prisma.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

    try {
      await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
      await page.goto(`${baseUrl}/dashboard/directory`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "الفروع والأقسام وجهات الاتصال" })).toBeVisible();

      await page.getByPlaceholder("اسم الفرع").fill("فرع جدة الرئيسي");
      await page.getByPlaceholder("المدينة").fill("جدة");
      await page.getByPlaceholder("الحي").fill("الروضة");
      await page.getByPlaceholder("الهاتف").fill("0500000011");
      await page.getByPlaceholder("واتساب").fill("966500000011");
      await page.getByRole("button", { name: "إضافة فرع" }).click();
      await expect(page).toHaveURL(/status=branch-created/);
      await expect(page.getByText("تمت إضافة الفرع بنجاح.")).toBeVisible();

      const branch = await prisma.branch.findFirstOrThrow({ where: { businessId: business.id } });
      expect(branch.isMain).toBe(true);
      expect(branch.isActive).toBe(true);

      await page.getByPlaceholder("مثال: المبيعات").fill("المبيعات");
      await page.getByPlaceholder("وصف مختصر للقسم").fill("طلبات العملاء والمبيعات الجديدة");
      await page.getByRole("button", { name: "إضافة قسم" }).click();
      await expect(page).toHaveURL(/status=department-created/);

      const department = await prisma.department.findFirstOrThrow({ where: { businessId: business.id } });
      expect(department.isActive).toBe(true);

      await page.getByPlaceholder("اسم المسؤول").fill("مسؤول مبيعات جدة");
      await page.getByPlaceholder("المسمى الوظيفي").fill("مسؤول مبيعات");
      await page.locator('select[name="departmentId"]').selectOption(department.id);
      await page.locator('select[name="branchId"]').selectOption(branch.id);
      await page.locator('input[name="phone"]').last().fill("0500000022");
      await page.locator('input[name="whatsapp"]').last().fill("966500000022");
      await page.getByPlaceholder("البريد الإلكتروني").fill("sales-directory@hee.local");
      await page.getByRole("button", { name: "حفظ جهة الاتصال" }).click();
      await expect(page).toHaveURL(/status=contact-created/);

      const contact = await prisma.contactPerson.findFirstOrThrow({ where: { businessId: business.id } });
      expect(contact.departmentId).toBe(department.id);
      expect(contact.branchId).toBe(branch.id);
      expect(contact.isPrimary).toBe(true);
      expect(contact.isActive).toBe(true);

      await page.goto(`${baseUrl}/${slug}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-renderer="hee-v3-smart-business-profile"]')).toBeVisible();
      await expect(page.getByText("تواصل مع الجهة المناسبة")).toBeVisible();
      await expect(page.getByText("المبيعات", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("مسؤول مبيعات جدة")).toBeVisible();
      await expect(page.getByText("فرع جدة الرئيسي")).toBeVisible();

      await prisma.branch.update({ where: { id: branch.id }, data: { isActive: false, isMain: false } });
      await prisma.contactPerson.update({ where: { id: contact.id }, data: { branchId: null } });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText("فرع جدة الرئيسي")).toHaveCount(0);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
