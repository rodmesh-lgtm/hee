import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

type Seeded = {
  ownerId: string;
  attackerId: string;
  sessionToken: string;
  businessAId: string;
  businessBId: string;
  attackerBusinessId: string;
  serviceAId: string;
  serviceBId: string;
};

let pool: Pool;
let db: PrismaClient;

async function seed(): Promise<Seeded> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const plan = await db.businessPlan.upsert({
    where: { code: "FREE" },
    update: { isActive: true },
    create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
  });
  const owner = await db.user.create({ data: { name: "Multi Business Owner", email: `multi-owner-${suffix}@hee.test`, passwordHash: "rc-only" } });
  const attacker = await db.user.create({ data: { name: "Other Tenant", email: `other-tenant-${suffix}@hee.test`, passwordHash: "rc-only" } });

  const businessA = await db.business.create({ data: {
    ownerId: owner.id, planId: plan.id, name: "منشأة ألف الآمنة", slug: `safe-a-${suffix}`,
    businessType: "خدمات أعمال", shortDescription: "المنشأة الأولى", phone: "0555000101", onboardingCompleted: true,
  } });
  const businessB = await db.business.create({ data: {
    ownerId: owner.id, planId: plan.id, name: "منشأة باء الآمنة", slug: `safe-b-${suffix}`,
    businessType: "خدمات أعمال", shortDescription: "المنشأة الثانية", phone: "0555000102", onboardingCompleted: true,
  } });
  const attackerBusiness = await db.business.create({ data: {
    ownerId: attacker.id, planId: plan.id, name: "منشأة المهاجم السرية", slug: `other-c-${suffix}`,
    businessType: "خدمات أعمال", shortDescription: "يجب ألا تظهر للمالك الآخر", phone: "0555000199", onboardingCompleted: true,
  } });

  const serviceA = await db.service.create({ data: { businessId: businessA.id, name: "خدمة ألف الخاصة", price: 10, sortOrder: 0 } });
  const serviceB = await db.service.create({ data: { businessId: businessB.id, name: "خدمة باء الخاصة", price: 20, sortOrder: 0 } });
  await db.service.create({ data: { businessId: attackerBusiness.id, name: "خدمة المهاجم السرية", price: 999, sortOrder: 0 } });

  const sessionToken = crypto.randomUUID();
  await db.session.create({ data: { token: sessionToken, userId: owner.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

  return {
    ownerId: owner.id,
    attackerId: attacker.id,
    sessionToken,
    businessAId: businessA.id,
    businessBId: businessB.id,
    attackerBusinessId: attackerBusiness.id,
    serviceAId: serviceA.id,
    serviceBId: serviceB.id,
  };
}

async function cleanup(seeded: Seeded) {
  const businessIds = [seeded.businessAId, seeded.businessBId, seeded.attackerBusinessId];
  await db.analyticsEvent.deleteMany({ where: { businessId: { in: businessIds } } });
  await db.service.deleteMany({ where: { businessId: { in: businessIds } } });
  await db.subscription.deleteMany({ where: { businessId: { in: businessIds } } });
  await db.business.deleteMany({ where: { id: { in: businessIds } } });
  await db.session.deleteMany({ where: { userId: { in: [seeded.ownerId, seeded.attackerId] } } });
  await db.authIdentity.deleteMany({ where: { userId: { in: [seeded.ownerId, seeded.attackerId] } } });
  await db.user.deleteMany({ where: { id: { in: [seeded.ownerId, seeded.attackerId] } } });
}

async function authenticate(page: import("@playwright/test").Page, token: string) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

async function switchBusiness(page: import("@playwright/test").Page, businessId: string) {
  const switcher = page.getByLabel("اختيار المنشأة").first();
  await expect(switcher).toBeVisible();
  await switcher.selectOption(businessId);
  await switcher.locator("xpath=..").getByRole("button", { name: "تبديل" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.locator("[data-active-business]")).toHaveAttribute("data-active-business", businessId);
}

test.describe.serial("active business tenant isolation", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for active-business isolation workflow");
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("isolates owned businesses and rejects cross-tenant selection and record tampering", async ({ page }) => {
    test.setTimeout(120_000);
    const seeded = await seed();
    await authenticate(page, seeded.sessionToken);

    try {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      const switcher = page.getByLabel("اختيار المنشأة").first();
      await expect(switcher).toBeVisible();
      await expect(switcher.locator("option")).toHaveCount(2);
      await expect(switcher.locator(`option[value="${seeded.businessAId}"]`)).toHaveCount(1);
      await expect(switcher.locator(`option[value="${seeded.businessBId}"]`)).toHaveCount(1);
      await expect(switcher.locator(`option[value="${seeded.attackerBusinessId}"]`)).toHaveCount(0);
      await expect(page.locator("[data-active-business]")).toHaveAttribute("data-active-business", seeded.businessAId);
      await expect(page.getByText("منشأة المهاجم السرية")).toHaveCount(0);

      // Use the real server action to select B, then prove reads/writes are scoped to B.
      await switchBusiness(page, seeded.businessBId);
      await page.goto(`${baseUrl}/dashboard/services`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("خدمة باء الخاصة", { exact: true })).toBeVisible();
      await expect(page.getByText("خدمة ألف الخاصة", { exact: true })).toHaveCount(0);
      await expect(page.getByText("خدمة المهاجم السرية", { exact: true })).toHaveCount(0);

      const addForm = page.locator('form').filter({ has: page.locator('input[name="name"][placeholder="اسم الخدمة"]') });
      await addForm.locator('input[name="name"]').fill("خدمة باء الجديدة المعزولة");
      await addForm.getByRole("button", { name: "إضافة" }).click();
      await expect.poll(async () => db.service.count({ where: { businessId: seeded.businessBId, name: "خدمة باء الجديدة المعزولة" } }), { timeout: 20_000 }).toBe(1);
      expect(await db.service.count({ where: { businessId: seeded.businessAId, name: "خدمة باء الجديدة المعزولة" } })).toBe(0);
      expect(await db.service.count({ where: { businessId: seeded.attackerBusinessId, name: "خدمة باء الجديدة المعزولة" } })).toBe(0);

      // Switch back to A, then tamper an A form so its hidden record id points at B.
      await switchBusiness(page, seeded.businessAId);
      await page.goto(`${baseUrl}/dashboard/services`, { waitUntil: "domcontentloaded" });
      const editForm = page.locator('form').filter({ has: page.locator(`input[name="id"][value="${seeded.serviceAId}"]`) }).first();
      await expect(editForm).toBeVisible();
      await editForm.locator('input[name="id"]').evaluate((input, foreignId) => { (input as HTMLInputElement).value = String(foreignId); }, seeded.serviceBId);
      await editForm.locator('input[name="name"]').fill("اسم اختراق يجب ألا يحفظ");
      await editForm.getByRole("button", { name: "حفظ" }).click();
      await expect.poll(async () => (await db.service.findUnique({ where: { id: seeded.serviceBId }, select: { name: true } }))?.name).toBe("خدمة باء الخاصة");
      await expect.poll(async () => (await db.service.findUnique({ where: { id: seeded.serviceAId }, select: { name: true } }))?.name).toBe("خدمة ألف الخاصة");

      // Tamper the DOM to submit another tenant's business id through the real switch action.
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      const protectedSwitcher = page.getByLabel("اختيار المنشأة").first();
      await protectedSwitcher.evaluate((select, foreignId) => {
        const option = document.createElement("option");
        option.value = String(foreignId);
        option.textContent = "منشأة مزورة";
        select.append(option);
        (select as HTMLSelectElement).value = String(foreignId);
      }, seeded.attackerBusinessId);
      await protectedSwitcher.locator("xpath=..").getByRole("button", { name: "تبديل" }).click();
      await page.waitForURL(/business=invalid/);
      await expect(page.locator("[data-active-business]")).toHaveAttribute("data-active-business", seeded.businessAId);
      await expect(page.getByText("منشأة المهاجم السرية")).toHaveCount(0);

      // Preview follows the verified active owned business after the rejected attack.
      await page.goto(`${baseUrl}/preview`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "منشأة ألف الآمنة" })).toBeVisible();
      await expect(page.getByText("منشأة المهاجم السرية")).toHaveCount(0);
    } finally {
      await cleanup(seeded);
    }
  });
});
