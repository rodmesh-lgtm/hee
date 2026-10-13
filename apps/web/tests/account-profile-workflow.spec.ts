import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { accountCodeHash } from "../app/lib/account-profile-domain";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
test("account edits persist and email changes require both fresh mailbox proofs", async ({ browser }) => {
  test.setTimeout(120_000);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const suffix = randomUUID();
  const oldEmail = `profile-${suffix}@example.invalid`;
  const nextEmail = `profile-new-${suffix}@example.invalid`;
  const owner = await db.user.create({ data: { name: "Profile Owner", email: oldEmail, emailVerifiedAt: new Date() } });
  const other = await db.user.create({ data: { name: "Other Owner", email: `profile-other-${suffix}@example.invalid` } });
  const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: {}, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3 } });
  const business = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: "اختبار بيانات الحساب", slug: `profile-${suffix}`, businessType: "خدمات", whatsapp: "966555000077", onboardingCompleted: true } });
  const token = randomUUID();
  const session = await db.session.create({ data: { token, userId: owner.id, expiresAt: new Date(Date.now() + 3600_000) } });
  await db.session.create({ data: { token: randomUUID(), userId: owner.id, expiresAt: new Date(Date.now() + 3600_000) } });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  async function pending(expiresAt = new Date(Date.now() + 600_000), email = nextEmail) {
    await db.oAuthState.deleteMany({ where: { nonce: owner.id, provider: "account-email-change" } });
    const id = randomUUID();
    await db.oAuthState.create({ data: { id, state: randomUUID(), nonce: owner.id, provider: "account-email-change", redirectTo: email, expiresAt,
      codeVerifier: JSON.stringify({ oldEmail, currentHash: accountCodeHash(id, "current", "001234"), newHash: accountCodeHash(id, "new", "005678") }) } });
  }
  async function confirm(current = "001234", next = "005678") {
    await page.getByLabel("رمز البريد الحالي", { exact: true }).fill(current);
    await page.getByLabel("رمز البريد الجديد", { exact: true }).fill(next);
    await page.getByRole("button", { name: "تأكيد تغيير البريد", exact: true }).click();
  }
  try {
    await context.addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
    await page.goto(`${baseUrl}/dashboard/settings`);
    await page.getByLabel("اسم صاحب الحساب", { exact: true }).fill("مالك الحساب المعدل");
    await page.getByLabel("رقم جوال الحساب", { exact: true }).fill("0551234567");
    await page.getByRole("button", { name: "حفظ بيانات الحساب" }).click();
    await expect(page.getByText("تم حفظ الاسم ورقم الجوال.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("اسم صاحب الحساب", { exact: true })).toHaveValue("مالك الحساب المعدل");
    await expect(page.getByLabel("رقم جوال الحساب", { exact: true })).toHaveValue("+966551234567");
    await page.getByText("تغيير البريد الإلكتروني", { exact: true }).click();
    await pending();
    await confirm("000000");
    await expect(page.getByText("الرموز غير صحيحة أو منتهية. تحقق منها أو اطلب رموزًا جديدة.")).toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).email).toBe(oldEmail);
    await pending(new Date(Date.now() - 1000));
    await confirm();
    await expect(page.getByText("الرموز غير صحيحة أو منتهية. تحقق منها أو اطلب رموزًا جديدة.")).toBeVisible();
    await pending(new Date(Date.now() + 600_000), other.email);
    await confirm();
    await expect(page.getByText("تعذر استخدام هذا البريد. اختر بريدًا آخر.")).toBeVisible();
    await pending();
    await confirm();
    await expect(page.getByText("تم تغيير البريد وتأكيده. استخدم البريد الجديد عند الدخول بكلمة المرور.")).toBeVisible();
    const saved = await db.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(saved.email).toBe(nextEmail);
    expect(saved.emailVerifiedAt).not.toBeNull();
    expect(await db.session.count({ where: { userId: owner.id } })).toBe(1);
    expect(await db.session.findUnique({ where: { id: session.id } })).not.toBeNull();
    expect(await db.oAuthState.count({ where: { nonce: owner.id, provider: "account-email-change" } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).name).toBe("Other Owner");
  } finally {
    await context.close();
    await db.oAuthState.deleteMany({ where: { nonce: owner.id } });
    await db.business.delete({ where: { id: business.id } });
    await db.session.deleteMany({ where: { userId: owner.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
    await db.$disconnect();
    await pool.end();
  }
});
