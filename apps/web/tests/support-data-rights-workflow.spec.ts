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
      await page.goto(`${baseUrl}/dashboard/working-hours`, { waitUntil: "domcontentloaded" });
      await page.getByRole("link", { name: "طلب مساعدة في هذه الصفحة" }).click();
      await expect(page).toHaveURL(/\/dashboard\/support\?context=booking/);
      await expect(page.locator("#dashboard-main-content").getByRole("heading", { name: "الدعم والمساعدة" })).toBeVisible();
      await expect(page.getByPlaceholder("صف المشكلة باختصار")).toHaveValue("مساعدة في المواعيد والحجوزات");
      await page.locator('select[name="category"]').selectOption("technical");
      await page.getByPlaceholder("صف المشكلة باختصار").fill("مشكلة اختبار الدعم");
      await page.getByPlaceholder(/اذكر التفاصيل/).fill("تفاصيل فنية لاختبار مسار دعم العميل وربط الطلب بالمنشأة الصحيحة.");
      await page.getByRole("button", { name: "إرسال الطلب" }).click();
      await expect(page).toHaveURL(/sent=1/);
      await expect(page.getByText("مشكلة اختبار الدعم")).toBeVisible();

      const supportEvent = await db.analyticsEvent.findFirstOrThrow({ where: { businessId: business.id, eventType: "support_requested" }, orderBy: { createdAt: "desc" } });
      expect((supportEvent.metadata as { requestedByUserId?: string }).requestedByUserId).toBe(owner.id);
      expect((supportEvent.metadata as { context?: string }).context).toBe("booking");

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
      await expect(ticket).toContainText("القسم: المواعيد والحجوزات");
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
  test("support history searches older tickets, paginates and isolates customer-visible data", async ({ page }) => {
    test.setTimeout(90_000);
    const suffix = crypto.randomUUID();
    const owner = await db.user.create({ data: { name: "History Owner", email: `history-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
    const otherOwner = await db.user.create({ data: { name: "Other History Owner", email: `other-history-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
    const business = await db.business.create({ data: { ownerId: owner.id, name: "سجل الدعم التجريبي", slug: `history-${suffix}`, businessType: "خدمات", onboardingCompleted: true } });
    const other = await db.business.create({ data: { ownerId: otherOwner.id, name: "منشأة أخرى", slug: `history-other-${suffix}`, businessType: "خدمات", onboardingCompleted: true } });
    const token = crypto.randomUUID();
    await db.session.create({ data: { token, userId: owner.id, expiresAt: new Date(Date.now() + 3_600_000) } });
    try {
      const now = Date.now();
      await db.analyticsEvent.createMany({ data: Array.from({ length: 24 }, (_, index) => ({
        businessId: business.id, eventType: "support_requested", createdAt: new Date(now-index*1000),
        metadata: { subject: `طلب متكرر ${index}`, message: "معلومات الطلب", category: "account", status: "open", requestedByEmail: "PRIVATE_INTERNAL_MARKER" },
      })) });
      const old = await db.analyticsEvent.create({ data: { businessId: business.id, eventType: "support_requested", createdAt: new Date(now-60_000), metadata: {
        subject: "طلب قديم بنسبة 100%_", message: "تفاصيل فريدة تظهر عند فتح الطلب", category: "technical", status: "resolved", resolutionNote: "تم إصلاح تعارض الموعد", requestedByEmail: "PRIVATE_INTERNAL_MARKER",
      } } });
      await db.analyticsEvent.create({ data: { businessId: business.id, eventType: "support_requested", createdAt: new Date(now-61_000), metadata: { subject: "طلب قديم بلا حالة", message: "legacy ticket" } } });
      await db.analyticsEvent.createMany({ data: [
        { businessId: other.id, eventType: "support_requested", metadata: { subject: "OTHER_TENANT_MARKER", message: "طلب قديم بنسبة 100%_", status: "resolved", category: "technical" } },
        { businessId: business.id, eventType: "page_view", metadata: { subject: "WRONG_EVENT_MARKER", message: "طلب قديم بنسبة 100%_" } },
      ] });
      await setSession(page, token);
      await page.goto(`${baseUrl}/dashboard/support?context=booking`);
      const history = page.getByRole("region", { name: "سجل طلبات الدعم", exact: true });
      const summary = page.getByRole("region", { name: "ملخص طلبات الدعم", exact: true });
      await expect(history.getByRole("status")).toHaveText("٢٦ طلب مطابق");
      await expect(history.locator("article")).toHaveCount(20);
      await expect(summary.locator("article").filter({ hasText: "طلبات مفتوحة" })).toContainText("٢٥");
      await expect(summary.locator("article").filter({ hasText: "طلبات تمت معالجتها" })).toContainText("١");
      await history.getByRole("link", { name: "التالي", exact: true }).click();
      await expect(page).toHaveURL(/context=booking.*page=2/);
      await expect(history.locator("article")).toHaveCount(6);
      const oldTicket = history.locator("article").filter({ hasText: "طلب قديم بنسبة" });
      await oldTicket.locator("summary").click();
      await expect(oldTicket.getByText("تفاصيل فريدة تظهر عند فتح الطلب", { exact: true })).toBeVisible();
      await expect(oldTicket.getByText(old.id, { exact: true })).toBeVisible();
      await expect(oldTicket.getByText("تم إصلاح تعارض الموعد", { exact: true })).toBeVisible();
      await history.getByRole("searchbox", { name: "البحث في طلبات الدعم" }).fill("100%_");
      await history.getByLabel("حالة الطلب", { exact: true }).selectOption("resolved");
      await history.getByLabel("تصنيف الطلب", { exact: true }).selectOption("technical");
      await history.getByRole("button", { name: "بحث في السجل", exact: true }).click();
      await expect(history.getByRole("status")).toHaveText("١ طلب مطابق");
      await expect(history.locator("article")).toHaveCount(1);
      await expect(history).toContainText("طلب قديم بنسبة 100%_");
      await expect(page).toHaveURL(/context=booking/);
      await expect(page.getByLabel("العنوان", { exact: true })).toHaveValue("مساعدة في المواعيد والحجوزات");
      await history.getByRole("searchbox", { name: "البحث في طلبات الدعم" }).fill("إصلاح تعارض");
      await history.getByRole("button", { name: "بحث في السجل", exact: true }).click();
      await expect(history.getByRole("status")).toHaveText("١ طلب مطابق");
      for (const query of ["PRIVATE_INTERNAL_MARKER", "OTHER_TENANT_MARKER", "' OR 1=1 --"]) {
        await history.getByRole("searchbox", { name: "البحث في طلبات الدعم" }).fill(query);
        await history.getByRole("button", { name: "بحث في السجل", exact: true }).click();
        await expect(history.getByRole("status")).toHaveText("٠ طلب مطابق");
        await expect(history).toContainText("لا توجد طلبات تطابق البحث والتصفية.");
      }
      await history.getByRole("link", { name: "مسح تصفية الطلبات", exact: true }).click();
      await expect(history.getByRole("status")).toHaveText("٢٦ طلب مطابق");
      await expect(history.getByRole("searchbox")).toHaveValue("");
      await expect(history.getByLabel("حالة الطلب", { exact: true })).toHaveValue("all");
      await page.goto(`${baseUrl}/dashboard/support?page=999999&status=open`);
      await expect(history.getByRole("status")).toHaveText("٢٥ طلب مطابق");
      await expect(history.locator("article")).toHaveCount(5);
      await expect(history).toContainText("طلب قديم بلا حالة");
      await expect(history).not.toContainText("OTHER_TENANT_MARKER");
      await expect(history).not.toContainText("WRONG_EVENT_MARKER");
    } finally {
      await db.analyticsEvent.deleteMany({ where: { businessId: { in: [business.id, other.id] } } });
      await db.business.deleteMany({ where: { id: { in: [business.id, other.id] } } });
      await db.session.deleteMany({ where: { userId: owner.id } });
      await db.user.deleteMany({ where: { id: { in: [owner.id, otherOwner.id] } } });
    }
  });

});
