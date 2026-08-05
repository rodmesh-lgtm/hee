import { test, expect } from "@playwright/test";

type Vp = { name: string; width: number; height: number };

const mobileViewports: Vp[] = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x800", width: 360, height: 800 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
];

const desktopViewports: Vp[] = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1536x864", width: 1536, height: 864 },
];

const all = [...desktopViewports, ...mobileViewports];

for (const vp of all) {
  test(`modal architecture viewport ${vp.name}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("http://127.0.0.1:3000/b/sms", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "اطلب الآن" }).first().click();

    const overlay = page.locator('div[role="dialog"]').first();
    const modal = overlay.locator(":scope > div").first();
    const requestBody = modal.locator("form > div.min-h-0.flex-1.overflow-y-auto").first();
    const requestSubmit = modal.getByRole("button", { name: "إرسال عبر واتساب" }).first();

    await expect(overlay).toBeVisible();
    await expect(requestSubmit).toBeVisible();

    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe("hidden");

    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    }

    await requestBody.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(requestSubmit).toBeVisible();

    await page.getByPlaceholder("الاسم").first().fill("اختبار");
    await page.getByPlaceholder("رقم الجوال").first().fill("0500000000");
    await page.getByPlaceholder("الخدمة المطلوبة").first().fill("استشارة");
    await page.getByPlaceholder("ملاحظات").first().fill("تفاصيل إضافية");

    const requestPopupPromise = page.waitForEvent("popup");
    await requestSubmit.click();
    const requestPopup = await requestPopupPromise;
    const requestUrl = requestPopup.url();
    expect(requestUrl.includes("wa.me/") || requestUrl.includes("api.whatsapp.com/send")).toBeTruthy();
    const requestText = new URL(requestUrl).searchParams.get("text") ?? "";
    expect(requestText).toContain("الاسم");
    expect(requestText).toContain("اختبار");
    await requestPopup.close();

    const bodyOverflowAfterClose = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflowAfterClose).toBe("");

    await page.getByRole("button", { name: "استفسر الآن" }).first().click();

    const inquiryBody = modal.locator("form > div.min-h-0.flex-1.overflow-y-auto").first();
    const inquirySubmit = modal.getByRole("button", { name: "إرسال الاستفسار عبر واتساب" }).first();

    await expect(inquirySubmit).toBeVisible();

    await inquiryBody.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(inquirySubmit).toBeVisible();

    await inquirySubmit.click();
    await expect(page.getByText("الاستفسار / الملاحظات مطلوب")).toBeVisible();

    await inquiryBody.locator("textarea").first().fill("عندي استفسار");
    const inquiryPopupPromise = page.waitForEvent("popup");
    await inquirySubmit.click();
    const inquiryPopup = await inquiryPopupPromise;
    const inquiryUrl = inquiryPopup.url();
    expect(inquiryUrl.includes("wa.me/") || inquiryUrl.includes("api.whatsapp.com/send")).toBeTruthy();
    const inquiryText = new URL(inquiryUrl).searchParams.get("text") ?? "";
    expect(inquiryText).toContain("الطلب / الاستفسار");
    expect(inquiryText).toContain("عندي استفسار");
    await inquiryPopup.close();

    await expect(modal).toBeHidden();

    const bodyOverflowAfterInquiry = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflowAfterInquiry).toBe("");

    expect(consoleErrors).toEqual([]);

    await context.close();
  });
}
