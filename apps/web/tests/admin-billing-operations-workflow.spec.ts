import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

test.describe("central admin billing operations", () => {
  test.afterAll(async () => { await db.$disconnect(); });

  test("admin can inspect subscriptions and payment evidence while paid mutations remain absent", async ({ page }) => {
    await page.goto("/admin/billing");
    await expect(page.getByRole("heading", { name: "الاشتراكات والفوترة" })).toBeVisible();
    await expect(page.getByText("دفتر الدفعات والإيصالات", { exact: true })).toBeVisible();
    await expect(page.getByText(/لا توجد هنا أداة لتفعيل باقة مدفوعة يدويًا/)).toBeVisible();
    await expect(page.getByRole("button", { name: /تفعيل|اعتماد|مدفوع/i })).toHaveCount(0);
  });
});
