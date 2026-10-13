import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test("booking bell alerts on new tenant bookings, supports mute and stops when access is revoked", async ({ browser }) => {
  test.setTimeout(120_000);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const suffix = randomUUID();
  const owner = await db.user.create({ data: { name: "Bell Owner", email: `bell-owner-${suffix}@example.invalid`, emailVerifiedAt: new Date() } });
  const employee = await db.user.create({ data: { name: "Bell Staff", email: `bell-staff-${suffix}@example.invalid`, emailVerifiedAt: new Date() } });
  const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: {}, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3 } });
  const business = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: "اختبار جرس المواعيد", slug: `bell-${suffix}`, businessType: "خدمات", onboardingCompleted: true } });
  const other = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: "منشأة أخرى", slug: `bell-other-${suffix}`, businessType: "خدمات", onboardingCompleted: true } });
  const member = await db.businessMember.create({ data: { businessId: business.id, userId: employee.id, role: "viewer", status: "active", permissions: ["appointments"] } });
  const customer = await db.customer.create({ data: { businessId: business.id, name: "عميل اختباري", phone: "+966555000099" } });
  const otherCustomer = await db.customer.create({ data: { businessId: other.id, name: "عميل آخر", phone: "+966555000098" } });
  const token = randomUUID();
  await db.session.create({ data: { token, userId: employee.id, expiresAt: new Date(Date.now() + 3600_000) } });
  const context = await browser.newContext();
  await context.addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
  await context.addInitScript(() => {
    const Original = window.AudioContext;
    (window as unknown as { bellToneCount: number }).bellToneCount = 0;
    window.AudioContext = class extends Original {
      createOscillator() {
        (window as unknown as { bellToneCount: number }).bellToneCount++;
        return super.createOscillator();
      }
    };
  });
  const page = await context.newPage();
  const toneCount = () => page.evaluate(() => (window as unknown as { bellToneCount: number }).bellToneCount);
  const addBooking = (businessId = business.id, customerId = customer.id) => db.booking.create({ data: { businessId, customerId, bookingDate: "2030-01-15", bookingTime: "10:00" } });
  try {
    await addBooking();
    const baseline = page.waitForResponse(r => r.url().includes("/api/dashboard/bookings/updates") && r.status() === 200);
    await page.goto(`${baseUrl}/dashboard`); await baseline;
    await expect(page.getByText(/وصل حجز جديد/)).toHaveCount(0);
    expect(await toneCount()).toBe(0);
    await page.getByRole("button", { name: "تفعيل جرس الحجوزات", exact: true }).click();
    await expect(page.getByRole("button", { name: "كتم جرس الحجوزات", exact: true })).toBeVisible();
    expect(await toneCount()).toBe(2); // The activation preview confirms browser audio is unlocked.
    await addBooking();
    await expect(page.getByText(/وصل حجز جديد/)).toBeVisible({ timeout: 20_000 });
    expect(await toneCount()).toBe(4);
    await page.getByRole("button", { name: "إخفاء التنبيه", exact: true }).click();
    await page.getByRole("button", { name: "كتم جرس الحجوزات", exact: true }).click();
    await addBooking();
    await expect(page.getByText(/وصل حجز جديد/)).toBeVisible({ timeout: 20_000 });
    expect(await toneCount()).toBe(4);
    await page.getByRole("button", { name: "إخفاء التنبيه", exact: true }).click();
    const poll = page.waitForResponse(r => r.url().includes("/api/dashboard/bookings/updates") && r.status() === 200);
    const foreignBooking = await addBooking(other.id, otherCustomer.id);
    const response = await poll;
    expect(JSON.stringify(await response.json())).not.toContain(foreignBooking.id);
    await expect(page.getByText(/وصل حجز جديد/)).toHaveCount(0);
    const wrongTenant = await context.request.get(`${baseUrl}/api/dashboard/bookings/updates?businessId=${other.id}`);
    expect(wrongTenant.status()).toBe(409);
    await db.businessMember.update({ where: { id: member.id }, data: { status: "revoked" } });
    await expect(page.getByRole("button", { name: "تفعيل جرس الحجوزات", exact: true })).toBeDisabled({ timeout: 20_000 });
    const denied = await context.request.get(`${baseUrl}/api/dashboard/bookings/updates?businessId=${business.id}`);
    expect(denied.status()).toBe(403);
  } finally {
    await context.close();
    await db.booking.deleteMany({ where: { businessId: { in: [business.id, other.id] } } });
    await db.customer.deleteMany({ where: { businessId: { in: [business.id, other.id] } } });
    await db.businessMember.deleteMany({ where: { businessId: business.id } });
    await db.business.deleteMany({ where: { id: { in: [business.id, other.id] } } });
    await db.session.deleteMany({ where: { userId: employee.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, employee.id] } } });
    await db.$disconnect(); await pool.end();
  }
});
