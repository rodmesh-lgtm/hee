# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/rc-owner-workflow.spec.ts >> RC owner workflow >> covers edit, preview, publish, persistence, and responsive rendering
- Location: tests/rc-owner-workflow.spec.ts:410:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 5

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 404 (Not Found)",
+   "Failed to load resource: the server responded with a status of 404 (Not Found)",
+   "Failed to load resource: the server responded with a status of 404 (Not Found)",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=f21e1]:
  - main [ref=f21e2]:
    - generic [ref=f21e3]:
      - generic [ref=f21e5]:
        - generic [ref=f21e6]:
          - img "غلاف النشاط" [ref=f21e7]
          - generic [ref=f21e9]:
            - button "إضافة للمفضلة" [ref=f21e12]:
              - generic [ref=f21e15]: حفظ
            - button "مشاركة" [ref=f21e16]
        - generic [ref=f21e25]:
          - generic [ref=f21e26]:
            - img "خدمات الخزامى التنفيذية - RC" [ref=f21e28]
            - generic [ref=f21e29]:
              - generic [ref=f21e30]:
                - heading "خدمات الخزامى التنفيذية - RC" [level=1] [ref=f21e31]
                - img "نشاط موثّق" [ref=f21e32]
              - paragraph [ref=f21e36]: خدمات منزلية
              - paragraph [ref=f21e37]: خدمات منزلية احترافية مع معاينة ونشر مباشر، مع فريق دعم، ساعات عمل واضحة، ومحتوى منشور جاهز لاستقبال العملاء عبر الصفحات والطلبات.
              - generic [ref=f21e38]:
                - generic [ref=f21e39]: الرياض • العليا
                - generic [ref=f21e40]: مفتوح الآن
                - generic [ref=f21e41]: يغلق الساعة ٦:٠٠ م
          - generic [ref=f21e42]:
            - button "احجز الآن" [ref=f21e43]
            - generic [ref=f21e48]:
              - link "واتساب" [ref=f21e49] [cursor=pointer]:
                - /url: https://wa.me/966555330011
              - link "اتصال" [ref=f21e53] [cursor=pointer]:
                - /url: tel:0555330011
              - link "الاتجاهات" [ref=f21e57] [cursor=pointer]:
                - /url: https://maps.google.com/?q=24.7136,46.6753
              - link "الموقع الإلكتروني" [ref=f21e62] [cursor=pointer]:
                - /url: https://services.example.com/
      - generic [ref=f21e67]:
        - generic [ref=f21e69]:
          - heading "خدماتنا" [level=2] [ref=f21e70]
          - generic [ref=f21e71]:
            - article [ref=f21e72]:
              - generic [ref=f21e73]:
                - generic [ref=f21e74]:
                  - paragraph [ref=f21e75]: صيانة عاجلة
                  - paragraph [ref=f21e76]: زيارة فورية خلال نفس اليوم
                - generic [ref=f21e77]:
                  - generic [ref=f21e78]: يبدأ من ١٨٠ ر.س
                  - generic [ref=f21e82]: 60 دقيقة
                - generic [ref=f21e86]:
                  - button "عرض التفاصيل" [ref=f21e87]
                  - link "احجز الآن" [ref=f21e88] [cursor=pointer]:
                    - /url: https://wa.me/966555330011?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AE%D8%B2%D8%A7%D9%85%D9%89%20%D8%A7%D9%84%D8%AA%D9%86%D9%81%D9%8A%D8%B0%D9%8A%D8%A9%20-%20RC%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D8%A8%D8%AD%D8%AC%D8%B2%20%D8%B5%D9%8A%D8%A7%D9%86%D8%A9%20%D8%B9%D8%A7%D8%AC%D9%84%D8%A9.
            - article [ref=f21e89]:
              - generic [ref=f21e90]:
                - generic [ref=f21e91]:
                  - paragraph [ref=f21e92]: تركيب وتجهيز
                  - paragraph [ref=f21e93]: تركيب احترافي مع متابعة
                - generic [ref=f21e94]:
                  - generic [ref=f21e95]: يبدأ من ٢٤٠ ر.س
                  - generic [ref=f21e99]: 120 دقيقة
                - generic [ref=f21e103]:
                  - button "عرض التفاصيل" [ref=f21e104]
                  - link "احجز الآن" [ref=f21e105] [cursor=pointer]:
                    - /url: https://wa.me/966555330011?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AE%D8%B2%D8%A7%D9%85%D9%89%20%D8%A7%D9%84%D8%AA%D9%86%D9%81%D9%8A%D8%B0%D9%8A%D8%A9%20-%20RC%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D8%A8%D8%AD%D8%AC%D8%B2%20%D8%AA%D8%B1%D9%83%D9%8A%D8%A8%20%D9%88%D8%AA%D8%AC%D9%87%D9%8A%D8%B2.
        - generic [ref=f21e108]:
          - generic [ref=f21e109]:
            - heading "لديك استفسار؟" [level=2] [ref=f21e110]
            - paragraph [ref=f21e111]: أرسل سؤالك وسنحوّله إلى واتساب مباشرة.
          - button "استفسر الآن" [ref=f21e113]
        - generic [ref=f21e117]:
          - heading "الموقع" [level=2] [ref=f21e118]
          - generic [ref=f21e119]:
            - link [ref=f21e120] [cursor=pointer]:
              - /url: https://maps.google.com/?q=24.7136,46.6753
            - paragraph [ref=f21e125]: طريق العليا العام، مبنى 12
            - paragraph [ref=f21e126]: العليا، الرياض
            - link "الاتجاهات" [ref=f21e128] [cursor=pointer]:
              - /url: https://maps.google.com/?q=24.7136,46.6753
        - generic [ref=f21e136]:
          - generic [ref=f21e137]:
            - heading "ساعات العمل" [level=2] [ref=f21e138]
            - generic [ref=f21e139]: مفتوح الآن
          - paragraph [ref=f21e140]: يغلق الساعة ٦:٠٠ م
          - button "عرض ساعات العمل" [ref=f21e141]
        - generic [ref=f21e146]:
          - heading "عن النشاط" [level=2] [ref=f21e147]
          - paragraph [ref=f21e149]: خدمات منزلية احترافية مع معاينة ونشر مباشر، مع فريق دعم، ساعات عمل واضحة، ومحتوى منشور جاهز لاستقبال العملاء عبر الصفحات والطلبات.
        - generic [ref=f21e151]:
          - heading "روابط إضافية" [level=2] [ref=f21e152]
          - link "انستغرام" [ref=f21e154] [cursor=pointer]:
            - /url: https://instagram.com/hee-workflow
        - generic [ref=f21e162]:
          - heading "أعمالنا" [level=2] [ref=f21e168]
          - generic [ref=f21e169]:
            - article [ref=f21e170]:
              - img "مشروع رقم 1" [ref=f21e172]
              - generic [ref=f21e173]:
                - heading "مشروع رقم 1" [level=3] [ref=f21e174]
                - paragraph [ref=f21e175]: وصف مختصر للمشروع 1
                - link "عرض العمل" [ref=f21e176] [cursor=pointer]:
                  - /url: https://example.com/projects/1
            - article [ref=f21e180]:
              - img "مشروع رقم 2" [ref=f21e182]
              - generic [ref=f21e183]:
                - heading "مشروع رقم 2" [level=3] [ref=f21e184]
                - paragraph [ref=f21e185]: وصف مختصر للمشروع 2
                - link "عرض العمل" [ref=f21e186] [cursor=pointer]:
                  - /url: https://example.com/projects/2
            - article [ref=f21e190]:
              - img "مشروع رقم 3" [ref=f21e192]
              - generic [ref=f21e193]:
                - heading "مشروع رقم 3" [level=3] [ref=f21e194]
                - paragraph [ref=f21e195]: وصف مختصر للمشروع 3
                - link "عرض العمل" [ref=f21e196] [cursor=pointer]:
                  - /url: https://example.com/projects/3
            - article [ref=f21e200]:
              - img "مشروع رقم 4" [ref=f21e202]
              - generic [ref=f21e203]:
                - heading "مشروع رقم 4" [level=3] [ref=f21e204]
                - paragraph [ref=f21e205]: وصف مختصر للمشروع 4
                - link "عرض العمل" [ref=f21e206] [cursor=pointer]:
                  - /url: https://example.com/projects/4
            - article [ref=f21e210]:
              - img "مشروع رقم 5" [ref=f21e212]
              - generic [ref=f21e213]:
                - heading "مشروع رقم 5" [level=3] [ref=f21e214]
                - paragraph [ref=f21e215]: وصف مختصر للمشروع 5
                - link "عرض العمل" [ref=f21e216] [cursor=pointer]:
                  - /url: https://example.com/projects/5
            - article [ref=f21e220]:
              - img "مشروع رقم 6" [ref=f21e222]
              - generic [ref=f21e223]:
                - heading "مشروع رقم 6" [level=3] [ref=f21e224]
                - paragraph [ref=f21e225]: وصف مختصر للمشروع 6
                - link "عرض العمل" [ref=f21e226] [cursor=pointer]:
                  - /url: https://example.com/projects/6
        - generic [ref=f21e231]:
          - heading "الملف التعريفي" [level=2] [ref=f21e236]
          - article [ref=f21e237]:
            - paragraph [ref=f21e238]: ملف تعريفي للاختبار قبل رفع PDF جديد من المحرر.
            - link "عرض الملف التعريفي" [ref=f21e239] [cursor=pointer]:
              - /url: /api/storage/5394cbaa-1d72-4f3c-804a-282aeb426030
        - generic [ref=f21e244]:
          - heading "فريق التواصل" [level=2] [ref=f21e245]
          - generic [ref=f21e246]:
            - heading "فريق المبيعات" [level=3] [ref=f21e248]
            - generic [ref=f21e249]:
              - article [ref=f21e250]:
                - generic [ref=f21e253]:
                  - paragraph [ref=f21e254]: سلمان الحربي
                  - paragraph [ref=f21e255]: مبيعات
                - generic [ref=f21e256]:
                  - link "واتساب" [ref=f21e257] [cursor=pointer]:
                    - /url: https://wa.me/966555880101
                  - link "اتصال" [ref=f21e260] [cursor=pointer]:
                    - /url: tel:0555880101
                  - link "بريد" [ref=f21e263] [cursor=pointer]:
                    - /url: mailto:sales1@hee.local
              - article [ref=f21e267]:
                - generic [ref=f21e270]:
                  - paragraph [ref=f21e271]: ريم الشمري
                  - paragraph [ref=f21e272]: تنسيق
                - generic [ref=f21e273]:
                  - link "واتساب" [ref=f21e274] [cursor=pointer]:
                    - /url: https://wa.me/966555880102
                  - link "اتصال" [ref=f21e277] [cursor=pointer]:
                    - /url: tel:0555880102
                  - link "بريد" [ref=f21e280] [cursor=pointer]:
                    - /url: mailto:sales2@hee.local
              - article [ref=f21e284]:
                - generic [ref=f21e287]:
                  - paragraph [ref=f21e288]: تركي العتيبي
                  - paragraph [ref=f21e289]: حجوزات
                - generic [ref=f21e290]:
                  - link "واتساب" [ref=f21e291] [cursor=pointer]:
                    - /url: https://wa.me/966555880103
                  - link "اتصال" [ref=f21e294] [cursor=pointer]:
                    - /url: tel:0555880103
                  - link "بريد" [ref=f21e297] [cursor=pointer]:
                    - /url: mailto:sales3@hee.local
          - generic [ref=f21e301]:
            - heading "خدمة العملاء" [level=3] [ref=f21e303]
            - generic [ref=f21e304]:
              - article [ref=f21e305]:
                - generic [ref=f21e308]:
                  - paragraph [ref=f21e309]: مي الغامدي
                  - paragraph [ref=f21e310]: خدمة العملاء
                - generic [ref=f21e311]:
                  - link "واتساب" [ref=f21e312] [cursor=pointer]:
                    - /url: https://wa.me/966555880201
                  - link "اتصال" [ref=f21e315] [cursor=pointer]:
                    - /url: tel:0555880201
                  - link "بريد" [ref=f21e318] [cursor=pointer]:
                    - /url: mailto:support1@hee.local
              - article [ref=f21e322]:
                - generic [ref=f21e325]:
                  - paragraph [ref=f21e326]: هشام القرني
                  - paragraph [ref=f21e327]: الدعم الفني
                - generic [ref=f21e328]:
                  - link "واتساب" [ref=f21e329] [cursor=pointer]:
                    - /url: https://wa.me/966555880202
                  - link "اتصال" [ref=f21e332] [cursor=pointer]:
                    - /url: tel:0555880202
                  - link "بريد" [ref=f21e335] [cursor=pointer]:
                    - /url: mailto:support2@hee.local
              - article [ref=f21e339]:
                - generic [ref=f21e342]:
                  - paragraph [ref=f21e343]: رنا القحطاني
                  - paragraph [ref=f21e344]: المتابعة
                - generic [ref=f21e345]:
                  - link "واتساب" [ref=f21e346] [cursor=pointer]:
                    - /url: https://wa.me/966555880203
                  - link "اتصال" [ref=f21e349] [cursor=pointer]:
                    - /url: tel:0555880203
                  - link "بريد" [ref=f21e352] [cursor=pointer]:
                    - /url: mailto:support3@hee.local
        - generic [ref=f21e356]:
          - generic [ref=f21e357]:
            - heading "العروض المميزة" [level=2] [ref=f21e358]
            - generic [ref=f21e359]: مفيدة الآن
          - generic [ref=f21e360]:
            - article [ref=f21e361]:
              - generic [ref=f21e363]:
                - generic [ref=f21e364]:
                  - paragraph [ref=f21e365]: عرض الصيانة الشهرية
                  - generic [ref=f21e366]: خصم 15%
                - paragraph [ref=f21e371]: خصم للعملاء الجدد
                - generic [ref=f21e372]: عرض مستمر
                - generic [ref=f21e377]:
                  - button "عرض التفاصيل" [ref=f21e378]
                  - link "استفيد الآن" [ref=f21e379] [cursor=pointer]:
                    - /url: https://wa.me/966555330011?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AE%D8%B2%D8%A7%D9%85%D9%89%20%D8%A7%D9%84%D8%AA%D9%86%D9%81%D9%8A%D8%B0%D9%8A%D8%A9%20-%20RC%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D8%A8%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%A7%D8%AF%D8%A9%20%D9%85%D9%86%20%D8%A7%D9%84%D8%B9%D8%B1%D8%B6%3A%20%D8%B9%D8%B1%D8%B6%20%D8%A7%D9%84%D8%B5%D9%8A%D8%A7%D9%86%D8%A9%20%D8%A7%D9%84%D8%B4%D9%87%D8%B1%D9%8A%D8%A9
            - article [ref=f21e380]:
              - generic [ref=f21e382]:
                - generic [ref=f21e383]:
                  - paragraph [ref=f21e384]: باقة التنفيذ الكامل
                  - generic [ref=f21e385]: باقة
                - paragraph [ref=f21e390]: تنفيذ شامل للمشروع الصغير
                - generic [ref=f21e391]: عرض مستمر
                - generic [ref=f21e396]:
                  - button "عرض التفاصيل" [ref=f21e397]
                  - link "استفيد الآن" [ref=f21e398] [cursor=pointer]:
                    - /url: https://wa.me/966555330011?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AE%D8%B2%D8%A7%D9%85%D9%89%20%D8%A7%D9%84%D8%AA%D9%86%D9%81%D9%8A%D8%B0%D9%8A%D8%A9%20-%20RC%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D8%A8%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%A7%D8%AF%D8%A9%20%D9%85%D9%86%20%D8%A7%D9%84%D8%B9%D8%B1%D8%B6%3A%20%D8%A8%D8%A7%D9%82%D8%A9%20%D8%A7%D9%84%D8%AA%D9%86%D9%81%D9%8A%D8%B0%20%D8%A7%D9%84%D9%83%D8%A7%D9%85%D9%84
        - generic [ref=f21e399]:
          - button "أدوات المشاركة" [ref=f21e400]
          - link "صُنع بواسطة HEE" [ref=f21e407] [cursor=pointer]:
            - /url: https://hee.sa
  - button "Open Next.js Dev Tools" [ref=f21e413] [cursor=pointer]
  - alert [ref=f21e417]
```

# Test source

```ts
  493 | 
  494 |         await expect(desktopPage.locator("body")).toContainText(/مبروك.*استقبال العملاء|تم حفظ التعديلات|تم حفظ.*منشورة|جاري النشر/i, { timeout: 30000 });
  495 |       });
  496 | 
  497 |       await stage("my-page-company-profile", async () => {
  498 |         await desktopPage.goto(`${baseUrl}/dashboard/my-page?edit=1`, { waitUntil: "domcontentloaded" });
  499 |         await expect(desktopPage.getByText("محتوى صفحتك")).toBeVisible();
  500 | 
  501 |         await desktopPage.getByText("الملف التعريفي", { exact: true }).click();
  502 |         const pdfInput = desktopPage.locator('input[type="file"][accept="application/pdf,.pdf"]');
  503 |         await pdfInput.setInputFiles({ name: "rc-profile.pdf", mimeType: "application/pdf", buffer: pdfBuffer });
  504 | 
  505 |         await expect.poll(async () => {
  506 |           const snapshot = await readSnapshot(seeded.businessId);
  507 |           const companyProfile = snapshot.pageModules.find((module) => module.id === "companyProfile")?.config.companyProfile as { pdfFileName?: string; pdfUrl?: string } | undefined;
  508 |           return Boolean(companyProfile?.pdfFileName && /rc-profile\.pdf/i.test(companyProfile.pdfFileName));
  509 |         }, { timeout: 20000 }).toBe(true);
  510 | 
  511 |         await expect(desktopPage.getByText(/rc-profile\.pdf/i).first()).toBeVisible({ timeout: 15000 });
  512 |       });
  513 | 
  514 |       await stage("module-reorder", async () => {
  515 |         const moduleMenuButtons = desktopPage.locator('button[aria-label="إجراءات القسم"]');
  516 |         const menuCount = await moduleMenuButtons.count();
  517 |         await moduleMenuButtons.nth(menuCount - 2).click();
  518 |         await desktopPage.getByRole("button", { name: "تحريك لأعلى" }).click();
  519 |         await expect(desktopPage.locator("body")).toContainText(/تم حفظ التعديلات|تم الحفظ|جاري الحفظ|جارٍ الحفظ/i, { timeout: 15000 });
  520 | 
  521 |         await desktopPage.reload({ waitUntil: "domcontentloaded" });
  522 |         await expect.poll(async () => {
  523 |           const snapshot = await readSnapshot(seeded.businessId);
  524 |           const companyProfile = snapshot.pageModules.find((module) => module.id === "companyProfile")?.config.companyProfile as { pdfFileName?: string; pdfUrl?: string } | undefined;
  525 |           return Boolean(companyProfile?.pdfFileName && /rc-profile\.pdf/i.test(companyProfile.pdfFileName) && companyProfile.pdfUrl?.startsWith("/api/storage/"));
  526 |         }, { timeout: 20000 }).toBe(true);
  527 |         await expect(desktopPage.getByText(/rc-profile\.pdf/i).first()).toBeVisible({ timeout: 15000 });
  528 |         await expect(desktopPage.getByRole("heading", { name: "خدمات الخزامى التنفيذية - RC" })).toBeVisible();
  529 |       });
  530 | 
  531 |       const after = await stage("readSnapshot-after", async () => readSnapshot(seeded.businessId));
  532 |       expect(after.services).toHaveLength(before.services.length);
  533 |       expect(after.openingHours).toHaveLength(before.openingHours.length);
  534 |       expect(after.socialLinks).toHaveLength(before.socialLinks.length);
  535 |       expect((after.pageModules.find((module) => module.id === "contactTeam")?.config.salesTeam as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.contactTeamSalesCount);
  536 |       expect((after.pageModules.find((module) => module.id === "contactTeam")?.config.customerServiceTeam as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.contactTeamSupportCount);
  537 |       expect((after.pageModules.find((module) => module.id === "portfolio")?.config.portfolioItems as Array<unknown> | undefined) ?? []).toHaveLength(seeded.snapshot.portfolioCount);
  538 |       expect(after.logoUrl ?? "").toMatch(/^\/(uploads\/|api\/storage\/)/);
  539 |       expect(after.coverUrl ?? "").toMatch(/^\/(uploads\/|api\/storage\/)/);
  540 |       expect(after.primaryColor.toLowerCase()).toBe("#0ea5e9");
  541 |       expect(after.isPublished).toBe(true);
  542 | 
  543 |       await stage("public-page", async () => {
  544 |         await desktopPage.goto(seeded.publicUrl, { waitUntil: "domcontentloaded" });
  545 |         await desktopPage.locator("body").waitFor({ state: "visible" });
  546 | 
  547 |         await expect(desktopPage.getByRole("heading", { name: /خدمات الخزامى التنفيذية - RC/i })).toBeVisible();
  548 |         await expect(desktopPage.getByRole("heading", { name: /فريق التواصل|معلومات التواصل/i })).toBeVisible();
  549 |         await expect(desktopPage.getByRole("heading", { name: /أعمالنا|معرض الأعمال/i })).toBeVisible();
  550 |         await expect(desktopPage.getByRole("heading", { name: /الملف التعريفي|ملف تعريفي/i })).toBeVisible();
  551 |         await expect(desktopPage.locator('a[href*="/api/storage/"]')).toBeVisible();
  552 |         await expect(desktopPage.locator('img[alt="غلاف النشاط"]')).toBeVisible();
  553 |         await expect(desktopPage.locator(`img[alt="خدمات الخزامى التنفيذية - RC"]`)).toBeVisible();
  554 | 
  555 |         const accentColor = await desktopPage.locator("main").evaluate((element) => getComputedStyle(element).getPropertyValue("--hee-accent").trim());
  556 |         expect(accentColor.toLowerCase()).toBe("#0ea5e9");
  557 | 
  558 |         const contactTeamBox = await desktopPage.locator("#contact-team-section").boundingBox();
  559 |         const portfolioBox = await desktopPage.locator("#portfolio-section").boundingBox();
  560 |         const companyProfileBox = await desktopPage.locator("#company-profile-section").boundingBox();
  561 |         expect(contactTeamBox).not.toBeNull();
  562 |         expect(portfolioBox).not.toBeNull();
  563 |         expect(companyProfileBox).not.toBeNull();
  564 |         if (contactTeamBox && portfolioBox && companyProfileBox) {
  565 |           expect(portfolioBox.y).toBeLessThan(companyProfileBox.y);
  566 |           expect(companyProfileBox.y).toBeLessThan(contactTeamBox.y);
  567 |         }
  568 |       });
  569 | 
  570 |       await stage("responsive-public", async () => {
  571 |         const responsiveTargets = [...mobileViewports, ...desktopViewports];
  572 |         for (const viewport of responsiveTargets) {
  573 |           const publicPage = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  574 |           await setSessionCookie(publicPage, seeded.sessionToken);
  575 | 
  576 |           const publicErrors = await openWithConsoleGuard(publicPage, seeded.publicUrl);
  577 |           await expect(publicPage.getByRole("heading", { name: /خدمات الخزامى التنفيذية - RC/i })).toBeVisible();
  578 |           await expect(publicPage.getByRole("heading", { name: /فريق التواصل|معلومات التواصل/i })).toBeVisible();
  579 |           expect(publicErrors).toEqual([]);
  580 | 
  581 |           await publicPage.goto(`${baseUrl}/dashboard/my-page?edit=1`, { waitUntil: "domcontentloaded" });
  582 |           await expect(publicPage.getByText("محتوى صفحتك")).toBeVisible();
  583 |           if (viewport.width < 1024) {
  584 |             await expect(publicPage.getByRole("button", { name: "معاينة صفحتي" })).toBeVisible();
  585 |           } else {
  586 |             await expect(publicPage.getByText("معاينة صفحتك")).toBeVisible();
  587 |           }
  588 | 
  589 |           await publicPage.close();
  590 |         }
  591 |       });
  592 | 
> 593 |       expect(editorErrors).toEqual([]);
      |                            ^ Error: expect(received).toEqual(expected) // deep equality
  594 |       await desktopPage.close();
  595 |     } finally {
  596 |       const dbClient = db;
  597 |       if (!dbClient) {
  598 |         return;
  599 |       }
  600 | 
  601 |       await dbClient.socialLink.deleteMany({ where: { businessId: seeded.businessId } });
  602 |       await dbClient.workingHours.deleteMany({ where: { businessId: seeded.businessId } });
  603 |       await dbClient.offer.deleteMany({ where: { businessId: seeded.businessId } });
  604 |       await dbClient.service.deleteMany({ where: { businessId: seeded.businessId } });
  605 |       await dbClient.business.delete({ where: { id: seeded.businessId } });
  606 |       await dbClient.session.deleteMany({ where: { token: seeded.sessionToken } });
  607 |       await dbClient.user.delete({ where: { id: seeded.userId } });
  608 |     }
  609 |   });
  610 | });
```