import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test("owner invites a verified employee and section permissions are enforced on reads and writes", async ({ browser }) => {
  test.setTimeout(150_000);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const suffix = randomUUID();
  const owner = await db.user.create({ data: { name: "Staff Test Owner", email: `staff-owner-${suffix}@example.invalid`, emailVerifiedAt: new Date() } });
  const employee = await db.user.create({ data: { name: "موظف الاختبار", email: `staff-member-${suffix}@example.invalid`, emailVerifiedAt: new Date() } });
  const stranger = await db.user.create({ data: { name: "Stranger", email: `staff-stranger-${suffix}@example.invalid`, emailVerifiedAt: new Date() } });
  const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: {}, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3 } });
  const business = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: "فريق اختبار الصلاحيات", slug: `staff-${suffix}`, businessType: "خدمات", onboardingCompleted: true } });
  const contexts = await Promise.all([owner, employee, stranger].map(async user => {
    const token = randomUUID();
    await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 3600_000) } });
    const context = await browser.newContext();
    await context.addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
    return context;
  }));
  const [ownerPage, memberPage, strangerPage] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await ownerPage.goto(`${baseUrl}/dashboard/staff`);
    await ownerPage.getByLabel("اسم الموظف", { exact: true }).fill(employee.name!);
    await ownerPage.getByLabel("بريد الموظف", { exact: true }).fill(employee.email);
    await ownerPage.getByLabel("المواعيد وإعدادات الحجز", { exact: true }).check();
    await ownerPage.getByRole("button", { name: "إضافة موظف وإرسال الدعوة" }).click();
    const link = ownerPage.getByLabel("رابط دعوة الموظف", { exact: true });
    await expect(link).toBeVisible();
    const invite = new URL(await link.inputValue());
    const invitePath = `${baseUrl}${invite.pathname}${invite.search}`;
    await strangerPage.goto(invitePath);
    await expect(strangerPage.getByRole("alert").filter({ hasText: "لا يطابق البريد المدعو" })).toContainText("لا يطابق البريد المدعو");
    expect(await db.businessMember.count({ where: { businessId: business.id } })).toBe(0);
    await memberPage.goto(invitePath);
    await memberPage.getByRole("button", { name: "قبول الدعوة والدخول لمساحة العمل" }).click();
    await expect(memberPage).toHaveURL(/\/dashboard$/);
    const member = await db.businessMember.findUniqueOrThrow({ where: { businessId_userId: { businessId: business.id, userId: employee.id } } });
    expect(member.permissions).toEqual(["appointments"]);
    await memberPage.goto(`${baseUrl}/dashboard/appointments`);
    await expect(memberPage.locator("#dashboard-main-content").getByRole("heading", { name: "المواعيد والحجوزات", exact: true })).toBeVisible();
    // Direct API calls must reject a member without page permission.
    const denied = await contexts[1].request.post(`${baseUrl}/api/dashboard/business/autosave`, { headers: { Origin: baseUrl }, data: { fields: { name: "غير مسموح" } } });
    expect([401, 403]).toContain(denied.status());
    expect((await db.business.findUniqueOrThrow({ where: { id: business.id } })).name).toBe(business.name);
    await memberPage.goto(`${baseUrl}/dashboard/staff`);
    await expect(memberPage.getByRole("button", { name: "إضافة موظف وإرسال الدعوة" })).toHaveCount(0);
    await memberPage.goto(`${baseUrl}/dashboard/inbox`);
    await expect(memberPage.getByRole("heading", { name: "الطلبات", exact: true })).toHaveCount(0);
    await memberPage.goto(invitePath);
    await expect(memberPage.getByText(/الدعوة غير صالحة/)).toBeVisible();
    await ownerPage.reload();
    const details = ownerPage.locator("details").filter({ hasText: employee.email });
    await details.locator("summary").click();
    await details.getByLabel("صفحتي والخدمات والفروع", { exact: true }).check();
    await details.getByRole("button", { name: "حفظ صلاحيات الموظف" }).click();
    await expect.poll(async () => (await db.businessMember.findUniqueOrThrow({ where: { id: member.id } })).permissions).toEqual(["page", "appointments"]);
    const allowed = await contexts[1].request.post(`${baseUrl}/api/dashboard/business/autosave`, { headers: { Origin: baseUrl }, data: { fields: { name: "تعديل الموظف المسموح" } } });
    expect(allowed.status()).toBe(200);
    await ownerPage.reload();
    const updated = ownerPage.locator("details").filter({ hasText: employee.email });
    await updated.locator("summary").click();
    await updated.getByRole("combobox", { name: "حالة وصول الموظف", exact: true }).selectOption("suspended");
    await updated.getByRole("button", { name: "حفظ صلاحيات الموظف" }).click();
    await expect.poll(async () => (await db.businessMember.findUniqueOrThrow({ where: { id: member.id } })).status).toBe("suspended");
    const suspended = await contexts[1].request.post(`${baseUrl}/api/dashboard/business/autosave`, { headers: { Origin: baseUrl }, data: { fields: { name: "موقوف" } } });
    expect([401, 403]).toContain(suspended.status());
    expect((await db.business.findUniqueOrThrow({ where: { id: business.id } })).name).toBe("تعديل الموظف المسموح");
  } finally {
    await Promise.all(contexts.map(c => c.close()));
    await db.oAuthState.deleteMany({ where: { nonce: business.id, provider: "business-staff-invite" } });
    await db.session.deleteMany({ where: { userId: { in: [owner.id, employee.id, stranger.id] } } });
    // Preserve immutable security audit rows; fixtures are retired in the isolated CI database.
    await db.business.update({ where: { id: business.id }, data: { deletedAt: new Date() } });
    await db.user.updateMany({ where: { id: { in: [owner.id, employee.id, stranger.id] } }, data: { deletedAt: new Date() } });
    await db.$disconnect(); await pool.end();
  }
});
