import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const db = new PrismaClient();
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

function passwordHash(password: string) { return createHash("sha256").update(password).digest("hex"); }

test("digital identity assets, presence and public access follow ownership and publication rules", async ({ page, browser }) => {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `identity-${nonce}@example.com`;
  const password = `Strong-${randomBytes(8).toString("hex")}!`;
  const plan = await db.plan.findFirst({ where: { isActive: true }, orderBy: { priceMonthly: "asc" } });
  expect(plan).toBeTruthy();
  const user = await db.user.create({ data: { name: "هوية رقمية", email, passwordHash: passwordHash(password), emailVerifiedAt: new Date() } });
  const business = await db.business.create({ data: { ownerId: user.id, planId: plan!.id, name: "هوية رقمية تجريبية", slug: `identity-${nonce}`, onboardingCompleted: true, isVerified: true, isPublished: false } });
  try {
    await page.goto(`${baseUrl}/login`);
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("كلمة المرور").fill(password);
    await Promise.all([page.waitForURL(/\/dashboard/), page.getByRole("button", { name: "تسجيل الدخول" }).click()]);

    await page.goto(`${baseUrl}/dashboard/digital-identity`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("الهوية الرقمية").first()).toBeVisible();

    const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF");
    await page.locator('input[type="file"]').setInputFiles({ name: "company.pdf", mimeType: "application/pdf", buffer: pdfBytes });
    const uploadButton = page.getByRole("button", { name: /رفع|حفظ/ }).first();
    if (await uploadButton.isVisible()) await uploadButton.click();
    await page.waitForTimeout(500);

    await db.business.update({ where: { id: business.id }, data: { companyProfileTitle: "الملف التعريفي الرسمي", instagramUrl: "https://instagram.com/hee.test" } });
    const stored = await db.business.findUnique({ where: { id: business.id }, select: { companyProfileUrl: true } });
    expect(stored?.companyProfileUrl).toBeTruthy();

    const anonymous = await browser.newContext();
    try {
      const anonymousPage = await anonymous.newPage();
      const privatePdf = await anonymousPage.request.get(`${baseUrl}${stored!.companyProfileUrl}`);
      expect(privatePdf.status()).toBe(404);

      await db.business.update({ where: { id: business.id }, data: { isPublished: true, publishedAt: new Date() } });
      await anonymousPage.goto(`${baseUrl}/${business.slug}`, { waitUntil: "domcontentloaded" });
      await expect(anonymousPage).toHaveTitle("هوية رقمية تجريبية");
      await expect(anonymousPage.getByText("الملف التعريفي الرسمي")).toBeVisible();
      await expect(anonymousPage.getByRole("link", { name: "فتح" })).toBeVisible();
      await expect(anonymousPage.getByText("حساباتنا الرسمية")).toBeVisible();
      await expect(anonymousPage.getByRole("link", { name: "حساب المنشأة على Instagram" })).toHaveAttribute("href", "https://instagram.com/hee.test");
      const publicPdf = await anonymousPage.request.get(`${baseUrl}${stored!.companyProfileUrl}`);
      expect(publicPdf.status()).toBe(200);

      await db.business.update({ where: { id: business.id }, data: { phone: null, whatsapp: null } });
      await page.goto(`${baseUrl}/dashboard/digital-identity`, { waitUntil: "domcontentloaded" });
    } finally { await anonymous.close(); }
  } finally {
    await db.business.deleteMany({ where: { id: business.id } });
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
