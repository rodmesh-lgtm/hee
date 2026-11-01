import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
test("account pause isolates tenants and restoration never restarts services", async ({ page }) => {
  test.setTimeout(120000);
  const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const suffix = crypto.randomUUID();
  const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: {}, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3 } });
  const owner = await db.user.create({ data: { name: "Pause test", email: `pause-${suffix}@hee.test`, emailVerifiedAt: new Date() } });
  const other = await db.user.create({ data: { name: "Other tenant", email: `other-${suffix}@hee.test`, emailVerifiedAt: new Date() } });
  const business = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: "Pause business", slug: `pause-${suffix}`, businessType: "خدمات", onboardingCompleted: true, isPublished: true, bookingAvailable: true } });
  const untouched = await db.business.create({ data: { ownerId: other.id, planId: plan.id, name: "Untouched business", slug: `other-${suffix}`, businessType: "خدمات", onboardingCompleted: true, isPublished: true } });
  const connection = await db.whatsAppConnection.create({ data: { businessId: business.id, provider: "meta", status: "connected", wabaId: suffix, phoneNumberId: suffix, credentialEnvelope: { fixture: true } } });
  const connector = await db.liveViewConnector.create({ data: { businessId: business.id, name: "Fixture", tokenHash: suffix } });
  const subscription = await db.subscription.create({ data: { businessId: business.id, planId: plan.id, autoRenew: true, provider: "manual", endsAt: new Date(Date.now() + 86400000) } });
  const member = await db.businessMember.create({ data: { businessId: business.id, userId: other.id, role: "viewer", status: "active", permissions: ["page"] } });
  const contactImport = await db.whatsAppContactImport.create({ data: { businessId: business.id, format: "csv", fileName: "fixture.csv", fileSha256: suffix, totalRows: 1, status: "queued" } });
  const importBatch = await db.whatsAppContactImportBatch.create({ data: { businessId: business.id, importId: contactImport.id, batchIndex: 0, rows: [], status: "queued" } });
  async function signIn() {
    const token = crypto.randomUUID();
    await db.session.create({ data: { userId: owner.id, token, expiresAt: new Date(Date.now() + 3600000) } });
    await page.context().clearCookies();
    await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
    return token;
  }
  try {
    await signIn();
    await page.goto(`${baseUrl}/dashboard/account-status`);
    await page.getByRole("textbox", { name: "بريد الحساب", exact: true }).fill(owner.email);
    await page.locator('input[name="confirmation"]').fill("WRONG");
    await page.getByRole("button", { name: "تأكيد تعطيل حسابي مؤقتًا", exact: true }).click();
    await expect(page).toHaveURL(/error=confirmation/);
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).deactivatedAt).toBeNull();
    await page.getByRole("textbox", { name: "بريد الحساب", exact: true }).fill(owner.email);
    await page.locator('input[name="confirmation"]').fill("PAUSE MY INFRO ACCOUNT");
    await page.getByRole("button", { name: "تأكيد تعطيل حسابي مؤقتًا", exact: true }).click();
    await expect(page).toHaveURL(/login\?account=paused/);
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).deactivatedAt).not.toBeNull();
    expect(await db.session.count({ where: { userId: owner.id } })).toBe(0);
    expect((await db.business.findUniqueOrThrow({ where: { id: business.id } })).isPublished).toBe(false);
    expect((await db.whatsAppConnection.findUniqueOrThrow({ where: { id: connection.id } })).status).toBe("disconnected");
    expect((await db.liveViewConnector.findUniqueOrThrow({ where: { id: connector.id } })).tokenHash).toBeNull();
    expect((await db.subscription.findUniqueOrThrow({ where: { id: subscription.id } })).autoRenew).toBe(false);
    expect((await db.businessMember.findUniqueOrThrow({ where: { id: member.id } })).status).toBe("suspended");
    expect((await db.business.findUniqueOrThrow({ where: { id: untouched.id } })).isPublished).toBe(true);
    expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).deactivatedAt).toBeNull();
    expect((await db.whatsAppContactImportBatch.findUniqueOrThrow({ where: { id: importBatch.id } })).status).toBe("failed");
    expect((await db.whatsAppContactImport.findUniqueOrThrow({ where: { id: contactImport.id } })).status).toBe("failed");
    await signIn();
    await page.goto(`${baseUrl}/dashboard`);
    await expect(page).toHaveURL(/account-paused/);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "إعادة تفعيل حسابي", exact: true }).click();
    await expect(page).toHaveURL(/settings\?account=restored/);
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).deactivatedAt).toBeNull();
    expect((await db.business.findUniqueOrThrow({ where: { id: business.id } })).isPublished).toBe(false);
    expect((await db.whatsAppConnection.findUniqueOrThrow({ where: { id: connection.id } })).status).toBe("disconnected");
    expect((await db.subscription.findUniqueOrThrow({ where: { id: subscription.id } })).autoRenew).toBe(false);
  } finally {
    await db.whatsAppContactImportBatch.deleteMany({ where: { businessId: business.id } });
    await db.whatsAppContactImport.deleteMany({ where: { businessId: business.id } });
    await db.analyticsEvent.deleteMany({ where: { businessId: business.id } });
    await db.businessMember.deleteMany({ where: { businessId: business.id } });
    await db.whatsAppConnection.deleteMany({ where: { businessId: business.id } });
    await db.liveViewConnector.deleteMany({ where: { businessId: business.id } });
    await db.subscription.deleteMany({ where: { businessId: business.id } });
    await db.session.deleteMany({ where: { userId: { in: [owner.id, other.id] } } });
    await db.business.deleteMany({ where: { id: { in: [business.id, untouched.id] } } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
    await db.$disconnect();
  }
});
