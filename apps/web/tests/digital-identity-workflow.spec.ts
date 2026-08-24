import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const pdfFixture = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF\n", "utf8");

test("company profile PDF, vCard and public access follow publication ownership rules", async ({ browser }) => {
  test.setTimeout(120_000);
  const connectionString = String(process.env.DATABASE_URL ?? "").trim();
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString, max: 4 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: { isActive: true }, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true } });
  const user = await db.user.create({ data: { name: "Identity Owner", email: `identity-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
  const business = await db.business.create({ data: { ownerId: user.id, planId: plan.id, name: "منشأة الهوية الرقمية", slug: `identity-${suffix}`, businessType: "خدمات أعمال", shortDescription: "اختبار مركز الهوية الرقمية", phone: "0555000999", city: "الرياض", onboardingCompleted: true, isPublished: false } });
  const token = crypto.randomUUID();
  await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const context = await browser.newContext();
  const page = await context.newPage();
  await context.addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
  let storageId = "";

  try {
    await page.goto(`${baseUrl}/dashboard/digital-identity`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "الهوية الرقمية" })).toBeVisible();
    await page.getByLabel("عنوان الملف").fill("الملف التعريفي الرسمي");
    await page.locator('input[name="profileFile"]').setInputFiles({ name: "company-profile.pdf", mimeType: "application/pdf", buffer: pdfFixture });
    await page.getByRole("button", { name: "رفع الملف التعريفي" }).click();
    await expect(page.getByText("تم حفظ الملف التعريفي PDF وأصبح مرتبطًا بالمنشأة.")).toBeVisible({ timeout: 20_000 });

    const stored = await db.business.findUnique({ where: { id: business.id }, select: { companyProfileUrl: true, companyProfileTitle: true } });
    expect(stored?.companyProfileTitle).toBe("الملف التعريفي الرسمي");
    expect(stored?.companyProfileUrl).toMatch(/^\/api\/storage\//);
    storageId = String(stored?.companyProfileUrl ?? "").split("/api/storage/")[1] || "";

    const ownerPdf = await page.request.get(`${baseUrl}${stored!.companyProfileUrl}`);
    expect(ownerPdf.status()).toBe(200);
    expect(ownerPdf.headers()["content-type"]).toContain("application/pdf");

    const vcard = await page.request.get(`${baseUrl}/api/dashboard/vcard`);
    expect(vcard.status()).toBe(200);
    expect(vcard.headers()["content-type"]).toContain("text/vcard");
    const vcardText = await vcard.text();
    expect(vcardText).toContain("BEGIN:VCARD");
    expect(vcardText).toContain("منشأة الهوية الرقمية");
    expect(vcardText).toContain(`https://hee.sa/${business.slug}`);

    const anonymous = await browser.newContext();
    try {
      const anonymousPage = await anonymous.newPage();
      const privatePdf = await anonymousPage.request.get(`${baseUrl}${stored!.companyProfileUrl}`);
      expect(privatePdf.status()).toBe(404);

      await db.business.update({ where: { id: business.id }, data: { isPublished: true, publishedAt: new Date() } });
      await anonymousPage.goto(`${baseUrl}/${business.slug}`, { waitUntil: "domcontentloaded" });
      await expect(anonymousPage.getByText("الملف التعريفي الرسمي")).toBeVisible();
      await expect(anonymousPage.getByRole("link", { name: "فتح الملف" })).toBeVisible();
      const publicPdf = await anonymousPage.request.get(`${baseUrl}${stored!.companyProfileUrl}`);
      expect(publicPdf.status()).toBe(200);

      await db.business.update({ where: { id: business.id }, data: { isPublished: false, publishedAt: null } });
      const revokedPdf = await anonymousPage.request.get(`${baseUrl}${stored!.companyProfileUrl}`);
      expect(revokedPdf.status()).toBe(404);
    } finally {
      await anonymous.close();
    }
  } finally {
    await context.close();
    await db.business.delete({ where: { id: business.id } });
    if (storageId) await db.storedObject.deleteMany({ where: { id: storageId } });
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.authIdentity.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
    await pool.end();
  }
});
