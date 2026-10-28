import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { bookingCredentialDigest } from "../app/lib/booking-verification-domain";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

type Seeded = { userId: string; businessId: string; serviceId: string; sessionToken: string; slug: string };

function riyadhDateKey(offsetDays: number) {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function openLaundrySection(page:Page,name:string){
 const button=page.getByRole("button",{name,exact:true});
 if(!await button.isVisible())await page.locator('.ld-mobile-nav button[aria-controls="laundry-navigation"]').click();
 await button.click();
}

async function setCashierDelivery(page:Page,days:number,hour:number){
  await page.getByLabel("يوم التسليم",{exact:true}).fill(riyadhDateKey(days));
  await page.getByLabel("ساعة التسليم",{exact:true}).selectOption(String(hour%12||12));
  await page.getByLabel("دقيقة التسليم",{exact:true}).selectOption("00");
  await page.getByLabel("فترة التسليم",{exact:true}).selectOption(hour>=12?"pm":"am");
}

function dayIndexForRiyadhDate(date: string) {
  const localNoon = new Date(`${date}T12:00:00+03:00`);
  return (localNoon.getUTCDay() + 6) % 7;
}

async function seed(): Promise<Seeded> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const plan = await db.businessPlan.upsert({ where: { code: "GROWTH_35" }, update: { isActive: true }, create: { code: "GROWTH_35", name: "Growth", monthlyPrice: 214, productLimit: 30, isActive: true } });
  const user = await db.user.create({ data: { name: "Transaction Owner", email: `tx-owner-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
  const slug = `tx-${suffix}`;
  const business = await db.business.create({
    data: {
      ownerId: user.id,
      planId: plan.id,
      name: "منشأة حجوزات HEE",
      slug,
      businessType: "خدمات",
      businessCategory: "مغاسل الملابس",
      shortDescription: "اختبار المعاملة من العميل إلى المالك",
      phone: "0555000022",
      whatsapp: "966555000022",
      city: "الرياض",
      isPublished: true,
      publishedAt: new Date(),
      bookingAvailable: true,
      onboardingCompleted: true,
    },
  });
  await db.subscription.create({ data: { businessId: business.id, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), autoRenew: false } });
  const service = await db.service.create({ data: { businessId: business.id, name: "استشارة لمدة ساعة", price: 150, durationMinutes: 60, bookingEnabled: true, isActive: true } });
  await db.workingHours.createMany({ data: Array.from({ length: 7 }, (_, dayOfWeek) => ({ businessId: business.id, dayOfWeek, opensAt: "08:00", closesAt: "23:00", isClosed: false })) });
  const sessionToken = crypto.randomUUID();
  await db.session.create({ data: { token: sessionToken, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return { userId: user.id, businessId: business.id, serviceId: service.id, sessionToken, slug };
}

async function setSession(page: Page, token: string) {
  // Injected fixture logins must clear the previous account's selected business.
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

async function cleanup(seed: Seeded) {
  await db.commerceBookingEligibility.deleteMany({ where: { businessId: seed.businessId } });
  await db.whatsAppCommerceIntegration.deleteMany({ where: { businessId: seed.businessId } });
  await db.analyticsEvent.deleteMany({ where: { businessId: seed.businessId } });
  await db.$executeRaw`DELETE FROM "PublicSubmission" WHERE "businessId" = ${seed.businessId}`;
  await db.$executeRaw`DELETE FROM "BookingVisitorVerification" WHERE "businessId"=${seed.businessId}`;
  await db.booking.deleteMany({ where: { businessId: seed.businessId } });
  await db.bookingAvailabilityOverride.deleteMany({ where: { businessId: seed.businessId } });
  await db.orderItem.deleteMany({ where: { order: { businessId: seed.businessId } } });
  await db.order.deleteMany({ where: { businessId: seed.businessId } });
  await db.product.deleteMany({ where: { businessId: seed.businessId } });
  await db.customer.deleteMany({ where: { businessId: seed.businessId } });
  await db.workingHours.deleteMany({ where: { businessId: seed.businessId } });
  await db.service.deleteMany({ where: { businessId: seed.businessId } });
  await db.branch.deleteMany({ where: { businessId: seed.businessId } });
  await db.subscription.deleteMany({ where: { businessId: seed.businessId } });
  const audit=await db.whatsAppAuditLog.count({where:{businessId:seed.businessId}});
  if(audit) { await db.business.update({where:{id:seed.businessId},data:{isPublished:false,deletedAt:new Date()}}); await db.session.deleteMany({where:{userId:seed.userId}}); return; }
  await db.business.delete({ where: { id: seed.businessId } });
  await db.session.deleteMany({ where: { userId: seed.userId } });
  await db.user.delete({ where: { id: seed.userId } });
}

// Each case creates its own tenants. Keep the configured single-worker order,
// but report every independent failure instead of skipping the remaining audit.
test.describe("public transactions workflow", () => {
  test("unified accounting adapts catalogues and records a general service order", async ({browser},testInfo)=>{
    test.setTimeout(120000);
    const fixture=await seed(),laundry=await seed();const page=await browser.newPage({viewport:{width:1440,height:1000}});
    try {
      await db.business.update({where:{id:fixture.businessId},data:{businessCategory:"صيانة الأجهزة"}});
      await db.business.update({where:{id:laundry.businessId},data:{businessCategory:"مغاسل الملابس"}});
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/dashboard`);
      const navigation=page.getByRole("navigation",{name:"التنقل الرئيسي",exact:true});
      await expect(navigation.getByRole("link",{name:"البرنامج المحاسبي",exact:true})).toHaveCount(1);
      await expect(navigation.getByRole("link",{name:"كاشير المغسلة",exact:true})).toHaveCount(0);
      await navigation.getByRole("link",{name:"البرنامج المحاسبي",exact:true}).click();
      await expect(page.locator(".accounting-program-bar")).toContainText("صيانة الأجهزة");
      await expect(page.getByRole("navigation",{name:"نوع خدمة المغسلة",exact:true})).toHaveCount(0);
      await openLaundrySection(page,"الخدمات والأسعار");
      await page.getByLabel("اسم الصنف",{exact:true}).fill("فحص جهاز");
      await page.getByLabel("التصنيف",{exact:true}).fill("صيانة");
      await page.getByLabel("السعر بالريال",{exact:true}).fill("25");
      await page.getByRole("button",{name:"إضافة الصنف",exact:true}).click();
      await expect(page.getByRole("status")).toContainText("تم حفظ العملية بنجاح");
      await openLaundrySection(page,"الكاشير");
      await page.getByRole("button",{name:"إضافة فحص جهاز",exact:true}).click();
      await page.getByLabel("اسم العميل",{exact:true}).fill("عميل صيانة تجريبي");
      await page.getByLabel("رقم الجوال",{exact:true}).fill("0500009955");
      await setCashierDelivery(page,2,16);
      await page.getByLabel("الدفعة المستلمة",{exact:true}).fill("10");
      await page.getByLabel("طريقة التحصيل",{exact:true}).selectOption("mixed");
      await page.getByLabel("الجزء النقدي من الدفعة",{exact:true}).fill("3");
      await page.getByRole("button",{name:"حفظ الطلب وإصدار المستند",exact:true}).click();
      const receipt=page.getByRole("dialog",{name:"تفاصيل طلب العميل",exact:true});
      await expect(receipt).toBeVisible();await expect(receipt.getByRole("heading",{name:"فاتورة",exact:true})).toBeVisible();
      await expect(receipt).toContainText("فحص جهاز");await expect(receipt).not.toContainText("المنشأة غير مسجلة");
      const rows=await db.$queryRaw<Array<{total:number;paid:number;items:Array<{name:string}>}>>`SELECT total,paid,items FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId}`;
      expect(rows).toHaveLength(1);expect(rows[0].total).toBe(2500);expect(rows[0].paid).toBe(1000);expect(rows[0].items[0].name).toBe("فحص جهاز");
      const payments=await db.$queryRaw<Array<{method:string;amount:number}>>`SELECT method,amount FROM "LaundryPayment" WHERE "businessId"=${fixture.businessId} ORDER BY method`;
      expect(payments).toEqual([{method:"card",amount:700},{method:"cash",amount:300}]);
      await expect(receipt.getByLabel("تفصيل الدفعات")).toContainText("شبكة — تسجيل يدوي");
      await receipt.getByLabel("دفعة إضافية",{exact:true}).fill("15");
      await receipt.getByLabel("الطريقة",{exact:true}).selectOption("mixed");
      await receipt.getByLabel("الجزء النقدي من الدفعة",{exact:true}).fill("5");
      await receipt.getByRole("button",{name:"تسجيل الدفعة",exact:true}).click();
      await expect(receipt.getByLabel("دفعة إضافية",{exact:true})).toHaveCount(0);
      const finalPayments=await db.$queryRaw<Array<{method:string;amount:number}>>`SELECT method,SUM(amount)::int AS amount FROM "LaundryPayment" WHERE "businessId"=${fixture.businessId} GROUP BY method ORDER BY method`;
      expect(finalPayments).toEqual([{method:"card",amount:1700},{method:"cash",amount:800}]);

      await page.getByRole("button",{name:"إغلاق",exact:true}).click();await openLaundrySection(page,"الكاشير");
      for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath(`laundry-unified-general-${width}.png`),fullPage:true});}
      await page.context().clearCookies();await setSession(page,laundry.sessionToken);await page.goto(`${baseUrl}/Accounting`);
      await expect(page.getByRole("navigation",{name:"نوع خدمة المغسلة",exact:true})).toBeVisible();
      await expect(page.getByRole("button",{name:"إضافة فحص جهاز",exact:true})).toHaveCount(0);
      await expect(page.locator(".accounting-program-bar")).toContainText("مغسلة ملابس");
    } finally {
      await page.close();
      for(const f of [fixture,laundry]){await db.session.deleteMany({where:{userId:f.userId}});await db.business.update({where:{id:f.businessId},data:{deletedAt:new Date(),isPublished:false}});}
    }
  });

  test("laundry accounting pages retain running balances and responsive navigation", async ({browser},testInfo)=>{
    test.setTimeout(120000);
    const fixture=await seed(),outsider=await seed();const page=await browser.newPage({viewport:{width:1440,height:1000}});
    try {
      const day=riyadhDateKey(0),start=new Date(`${day.slice(0,7)}-01T00:00:00+03:00`);
      const openingAt=new Date(start.getTime()-86400000);
      const entries=Array.from({length:206},(_,i)=>({id:crypto.randomUUID(),number:i+1,amount:i===0?5000:100,at:(i===0?openingAt:new Date(`${day}T00:00:00+03:00`)).toISOString()}));
      await db.$transaction(async tx=>{
        await tx.$executeRaw`INSERT INTO "LaundryBook" ("businessId","createdBy","initializedAt") VALUES (${fixture.businessId},${fixture.userId},now())`;
        await tx.$executeRaw`INSERT INTO "LaundryAccount" ("businessId",code,name,kind) VALUES (${fixture.businessId},'1100','صندوق اختبار التصفح','asset'),(${fixture.businessId},'3000','رأس المال التجريبي','equity')`;
        for(const e of entries){
          await tx.$executeRaw`INSERT INTO "LaundryJournal" (id,"businessId",number,"sourceKey",description,"effectiveAt","createdBy") VALUES (${e.id},${fixture.businessId},${e.number},${`manual:${e.id}`},'قيد اختبار ترقيم الصفحات',${new Date(e.at)},${fixture.userId})`;
          await tx.$executeRaw`INSERT INTO "LaundryJournalLine" (id,"businessId","journalId","accountCode",debit,credit) VALUES (${crypto.randomUUID()},${fixture.businessId},${e.id},'1100',${e.amount},0),(${crypto.randomUUID()},${fixture.businessId},${e.id},'3000',0,${e.amount})`;
        }
      },{timeout:30000});
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/Laundromat/Accounting`);
      await expect(page.getByRole("heading",{name:"ميزان المراجعة ودليل الحسابات",exact:true})).toBeVisible();
      await page.getByRole("searchbox",{name:"بحث دليل الحسابات",exact:true}).fill("1100");
      const accountRequest=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"1100 · صندوق اختبار التصفح",exact:true}).click();const captured=await accountRequest;
      const detail=page.locator(".ld-ledger-detail");await expect(detail).toContainText("205 حركة");
      await expect(detail.locator("tbody tr")).toHaveCount(200);
      await page.getByRole("button",{name:"صفحة الكشف التالية",exact:true}).click();
      await expect(detail.locator("tbody tr")).toHaveCount(5);
      await expect(detail.locator("tbody tr").last().locator("td").last()).toContainText("٢٥٥٫٠٠");
      const download=page.waitForEvent("download");await page.getByRole("button",{name:"تصدير صفحة الكشف CSV",exact:true}).click();expect((await download).suggestedFilename()).toContain("page-2");
      await page.getByRole("button",{name:"سجل اليومية",exact:true}).click();await expect(page.locator(".ld-ledger-table:visible tbody tr")).toHaveCount(100);
      await page.getByRole("button",{name:"القيود التالية",exact:true}).click();await expect(page.getByText("صفحة 2 من 3",{exact:true})).toBeVisible();
      await page.getByRole("button",{name:"القيود التالية",exact:true}).click();await expect(page.locator(".ld-ledger-table:visible tbody tr")).toHaveCount(5);
      await page.getByRole("button",{name:"الحسابات والتقارير",exact:true}).click();
      for(const size of [{width:1440,height:1000},{width:834,height:1112},{width:390,height:844}]){
        await page.setViewportSize(size);expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
        await page.screenshot({path:testInfo.outputPath(`laundry-accounting-${size.width}.png`),fullPage:true});
      }
      await openLaundrySection(page,"المخزون والجرد");await expect(page.getByRole("heading",{name:"المخزون والجرد",exact:true})).toBeVisible();
      await setSession(page,outsider.sessionToken);
      const denied=await page.request.post(captured.url(),{headers:{"next-action":captured.headers()["next-action"],"content-type":captured.headers()["content-type"],origin:new URL(baseUrl).origin},data:captured.postData()??""});expect(await denied.text()).toContain("تفاصيل الدفتر تتطلب صلاحية محاسبة المنشأة النشطة");
    }finally{await page.close();await db.session.deleteMany({where:{userId:fixture.userId}});await db.business.update({where:{id:fixture.businessId},data:{deletedAt:new Date(),isPublished:false}});await cleanup(outsider);}
  });

  test("laundry inventory valuation reconciles opening stock, purchases, consumption and transfers", async ({browser},testInfo) => {
    test.setTimeout(180000);
    const fixture=await seed();const page=await browser.newPage({viewport:{width:390,height:844}});
    const item=crypto.randomUUID(),warehouse=crypto.randomUUID(),destination=crypto.randomUUID(),supplier=crypto.randomUUID();
    try {
      await db.$executeRaw`INSERT INTO "LaundryWarehouse" (id,"businessId",name) VALUES (${warehouse},${fixture.businessId},'مستودع التقييم'),(${destination},${fixture.businessId},'مستودع النقل')`;
      await db.$executeRaw`INSERT INTO "LaundryStockItem" (id,"businessId",sku,name,unit) VALUES (${item},${fixture.businessId},'VAL-001','مادة تقييم تجريبية','piece')`;
      await db.$executeRaw`INSERT INTO "LaundryStockBalance" ("businessId","warehouseId","itemId",quantity) VALUES (${fixture.businessId},${warehouse},${item},10000)`;
      await db.$executeRaw`INSERT INTO "LaundrySupplier" (id,"businessId",name) VALUES (${supplier},${fixture.businessId},'مورد التقييم')`;
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/Laundromat/Accounting`);
      await page.getByRole("button",{name:"تهيئة الدفتر من العمليات المسجلة",exact:true}).click();await expect(page.getByRole("heading",{name:"ميزان المراجعة ودليل الحسابات",exact:true})).toBeVisible();
      await openLaundrySection(page,"المخزون والجرد");
      await page.getByLabel("المستودع المعروض",{exact:true}).selectOption(warehouse);
      await page.getByLabel("مادة الحركة",{exact:true}).selectOption(item);
      await page.getByText("تقييم افتتاحي للمادة المحددة",{exact:true}).click();
      await page.getByLabel("قيمة الرصيد الحالي الموثقة — ريال",{exact:true}).fill("100");
      await page.getByLabel("مرجع تكلفة الرصيد الافتتاحي",{exact:true}).fill("رصيد افتتاحي موثق للاختبار");
      await page.getByRole("checkbox",{name:"راجعت التكلفة ولم أسجلها سابقًا في حساب المخزون"}).check();
      await page.getByRole("button",{name:"اعتماد القيمة الافتتاحية",exact:true}).click();await expect(page.getByRole("status")).toContainText("تم حفظ");
      await openLaundrySection(page,"الموردون والمشتريات");
      await page.getByLabel("نوع الشراء",{exact:true}).selectOption("inventory");await page.getByLabel("مادة الشراء",{exact:true}).selectOption(item);await page.getByLabel("مستودع الشراء",{exact:true}).selectOption(warehouse);
      await page.getByLabel("كمية الشراء بوحدة المادة",{exact:true}).fill("10");await page.getByLabel("مورد الفاتورة",{exact:true}).selectOption(supplier);await page.getByLabel("رقم فاتورة المورد",{exact:true}).fill("STOCK-001");await page.getByLabel("إجمالي الفاتورة الفعلي",{exact:true}).fill("300");await page.getByLabel("وصف الخدمة أو مواد الشراء",{exact:true}).fill("شراء مواد للمخزون بتكلفة موثقة");
      const sent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));await page.getByRole("button",{name:"حفظ فاتورة المورد وترحيلها",exact:true}).click();const request=await sent;await expect(page.getByRole("status")).toContainText("حُفظت");
      await page.request.post(request.url(),{headers:{"next-action":request.headers()["next-action"],"content-type":request.headers()["content-type"],origin:new URL(baseUrl).origin},data:request.postData()??""});
      const balance=async()=>db.$queryRaw<Array<{quantity:number;value:number}>>`SELECT quantity::float8,value::float8 FROM "LaundryStockBalance" WHERE "businessId"=${fixture.businessId} AND "warehouseId"=${warehouse} AND "itemId"=${item}`;
      expect((await balance())[0]).toEqual({quantity:20000,value:40000});
      await openLaundrySection(page,"المخزون والجرد");await page.getByLabel("المستودع المعروض",{exact:true}).selectOption(warehouse);await page.getByLabel("مادة الحركة",{exact:true}).selectOption(item);
      await page.getByLabel("نوع حركة المخزون",{exact:true}).selectOption("issue");await page.getByLabel("كمية الحركة",{exact:true}).fill("5");await page.getByLabel("سبب الحركة أو مرجع الاستلام",{exact:true}).fill("صرف للاستهلاك في الاختبار");await page.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();await expect(page.getByRole("status")).toContainText("تم حفظ");expect((await balance())[0]).toEqual({quantity:15000,value:30000});
      await page.getByLabel("نوع حركة المخزون",{exact:true}).selectOption("transfer");await page.getByLabel("المستودع المستلم",{exact:true}).selectOption(destination);await page.getByLabel("كمية الحركة",{exact:true}).fill("5");await page.getByLabel("سبب الحركة أو مرجع الاستلام",{exact:true}).fill("نقل يحافظ على قيمة المخزون");await page.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();await expect(page.getByRole("status")).toContainText("تم حفظ");expect((await balance())[0]).toEqual({quantity:10000,value:20000});
      await page.getByLabel("المستودع المعروض",{exact:true}).selectOption(destination);await page.getByLabel("نوع حركة المخزون",{exact:true}).selectOption("count");await page.getByLabel("الكمية الفعلية بعد العد",{exact:true}).fill("3");await page.getByLabel("سبب الحركة أو مرجع الاستلام",{exact:true}).fill("عجز جرد موثق للاختبار");await page.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();await expect(page.getByRole("status")).toContainText("تم حفظ");
      const totals=await db.$queryRaw<Array<{stock:number;ledger:number;expense:number}>>`SELECT (SELECT SUM(value)::float8 FROM "LaundryStockBalance" WHERE "businessId"=${fixture.businessId}) AS stock,(SELECT SUM(debit-credit)::float8 FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId} AND "accountCode"='1300') AS ledger,(SELECT SUM(debit-credit)::float8 FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId} AND "accountCode"='5100') AS expense`;
      expect(totals[0]).toEqual({stock:26000,ledger:26000,expense:14000});
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath("laundry-valued-stock-mobile.png"),fullPage:true});
    } finally {await page.close();await db.session.deleteMany({where:{userId:fixture.userId}});await db.business.update({where:{id:fixture.businessId},data:{deletedAt:new Date(),isPublished:false}});}
  });

  test("laundry contracts preserve signed terms, print on mobile and isolate tenants", async ({browser},testInfo) => {
    test.setTimeout(120000);
    const fixture=await seed(), outsider=await seed();
    const page=await browser.newPage({viewport:{width:390,height:844}});
    try {
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/Laundromat/Accounting`);
      await openLaundrySection(page,"العقود والتوقيع");
      await page.getByLabel("مرجع العقد",{exact:true}).fill("CONTRACT-001");
      await page.getByLabel("عنوان العقد",{exact:true}).fill("عقد خدمات مغسلة تجريبي");
      await page.getByLabel("اسم عميل العقد",{exact:true}).fill("عميل توقيع تجريبي");
      await page.getByLabel("جوال عميل العقد",{exact:true}).fill("0500009941");
      await page.getByLabel("بداية العقد",{exact:true}).fill(riyadhDateKey(0));
      await page.getByLabel("نهاية العقد",{exact:true}).fill(riyadhDateKey(30));
      await page.getByLabel("القيمة التعاقدية الإجمالية — ريال",{exact:true}).fill("250");
      await page.getByLabel("شروط العقد والخدمات المتفق عليها",{exact:true}).fill("شروط اختبار فقط: خدمات غسيل وكوي وفق الاتفاق المسجل بين الطرفين.");
      await page.getByRole("button",{name:"إنشاء نسخة العقد",exact:true}).click();
      await page.getByRole("button",{name:"فتح العقد CONTRACT-001",exact:true}).click();
      const dialog=page.getByRole("dialog",{name:"عقد خدمات المنشأة"});await expect(dialog).toBeVisible();
      const box=await page.getByRole("img",{name:"مساحة توقيع العميل",exact:true}).boundingBox();expect(box).not.toBeNull();
      await page.mouse.move(box!.x+20,box!.y+40);await page.mouse.down();
      for(let i=1;i<12;i++)await page.mouse.move(box!.x+20+i*12,box!.y+40+(i%2)*30);
      await page.mouse.up();
      await page.getByLabel("اسم الموقّع على العقد",{exact:true}).fill("عميل توقيع تجريبي");
      await page.getByRole("checkbox",{name:/أنا العميل أو ممثله/}).check();
      const sent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"حفظ توقيع العميل",exact:true}).click();const request=await sent;
      await expect(dialog.getByRole("img",{name:"التوقيع المحفوظ",exact:true})).toBeVisible();
      await expect(dialog.getByRole("button",{name:"حفظ توقيع العميل",exact:true})).toHaveCount(0);
      const replay={headers:{"next-action":request.headers()["next-action"],"content-type":request.headers()["content-type"],origin:new URL(baseUrl).origin},data:request.postData()??""};
      await page.request.post(request.url(),replay);
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryAudit" WHERE "businessId"=${fixture.businessId} AND action='contract-sign'`)[0].n).toBe(1);
      await expect(db.$executeRaw`UPDATE "LaundryContract" SET terms='changed' WHERE "businessId"=${fixture.businessId}`).rejects.toThrow("LAUNDRY_CONTRACT_TERMS_IMMUTABLE");
      await page.emulateMedia({media:"print"});await expect(page.locator(".ld-dialog[open] .ld-receipt")).toBeVisible();await expect(page.locator('.ld-dialog[open] svg[aria-label="التوقيع المحفوظ"]')).toBeVisible();
      expect(await page.evaluate(()=>getComputedStyle(document.body).page)).toBe("laundry-a4");
      await page.emulateMedia({media:"screen"});expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath("laundry-contract-mobile.png"),fullPage:true});
      await page.getByText("إلغاء العقد مع حفظ سجله",{exact:true}).click();
      await page.getByLabel("سبب إلغاء العقد",{exact:true}).fill("انتهاء الاتفاق التجريبي");await page.getByRole("button",{name:"تأكيد إلغاء العقد",exact:true}).click();
      await expect(dialog.getByText("سبب الإلغاء: انتهاء الاتفاق التجريبي",{exact:true})).toBeVisible();await expect(dialog.getByRole("img",{name:"التوقيع المحفوظ",exact:true})).toBeVisible();
      await setSession(page,outsider.sessionToken);const denied=await page.request.post(request.url(),replay);expect(await denied.text()).toContain("المنشأة النشطة");
    } finally {
      await page.close();await db.session.deleteMany({where:{userId:fixture.userId}});
      await db.business.update({where:{id:fixture.businessId},data:{deletedAt:new Date(),isPublished:false}});await cleanup(outsider);
    }
  });

  test("laundry bank reconciliation persists balanced evidence and denies tenant replay", async ({browser}, testInfo) => {
    test.setTimeout(120000);
    const fixture=await seed(), outsider=await seed();
    const page=await browser.newPage({viewport:{width:390,height:844}});
    try {
      await setSession(page,fixture.sessionToken); await page.goto(`${baseUrl}/Laundromat/Accounting`);
      await page.getByRole("button",{name:"تهيئة الدفتر من العمليات المسجلة",exact:true}).click();
      await expect(page.getByRole("heading",{name:"ميزان المراجعة ودليل الحسابات",exact:true})).toBeVisible();
      await page.getByRole("button",{name:"قيد جديد",exact:true}).click();
      await page.getByLabel("تاريخ القيد",{exact:true}).fill(riyadhDateKey(-2));
      await page.getByLabel("بيان القيد",{exact:true}).fill("رصيد البنك الموثق للاختبار");
      await page.getByLabel("الحساب — سطر 1",{exact:true}).selectOption("1120");
      await page.getByLabel("الحساب — سطر 2",{exact:true}).selectOption("3000");
      await page.getByLabel("المبلغ — سطر 1",{exact:true}).fill("100");
      await page.getByLabel("المبلغ — سطر 2",{exact:true}).fill("100");
      await page.getByRole("button",{name:"ترحيل القيد المتوازن",exact:true}).click();
      await expect(page.getByRole("button",{name:"عكس القيد",exact:true})).toBeVisible();
      await page.getByRole("button",{name:"إعدادات الدفتر",exact:true}).click();await page.getByText("إقفال فترة محاسبية",{exact:true}).click();
      await page.getByLabel("إقفال حتى نهاية يوم",{exact:true}).fill(riyadhDateKey(-1));
      await page.getByRole("checkbox",{name:"راجعت الفترة وأفهم أن الإقفال يمنع الترحيل إليها"}).check();
      await page.getByRole("button",{name:"إقفال الفترة السابقة",exact:true}).click();
      await expect(page.getByText(/آخر حد إقفال:/)).toBeVisible();
      await openLaundrySection(page,"التسوية البنكية");
      await page.getByLabel("تاريخ نهاية كشف البنك",{exact:true}).fill(riyadhDateKey(-1));
      await page.getByRole("button",{name:"تحميل حركات المطابقة",exact:true}).click();
      await page.getByLabel("مرجع كشف البنك",{exact:true}).fill("BANK-AUDIT-001");
      await page.getByLabel("رصيد نهاية الكشف — ريال",{exact:true}).fill("99");
      await page.getByRole("checkbox",{name:/مطابقة القيد/}).check();
      await page.getByRole("checkbox",{name:/راجعت الكشف والحركات/}).check();
      await expect(page.getByRole("button",{name:"اعتماد المطابقة المتوازنة",exact:true})).toBeDisabled();
      await page.getByLabel("رصيد نهاية الكشف — ريال",{exact:true}).fill("100");
      const sent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"اعتماد المطابقة المتوازنة",exact:true}).click();const request=await sent;
      await expect(page.getByRole("status")).toContainText("اعتُمدت المطابقة");
      await expect(page.getByText("BANK-AUDIT-001",{exact:true})).toBeVisible();
      const replay={headers:{"next-action":request.headers()["next-action"],"content-type":request.headers()["content-type"],origin:new URL(baseUrl).origin},data:request.postData()??""};
      await page.request.post(request.url(),replay);
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryReconciliation" WHERE "businessId"=${fixture.businessId}`)[0].n).toBe(1);
      const download=page.waitForEvent("download");await page.getByRole("button",{name:"تصدير المطابقة CSV",exact:true}).click();expect((await download).suggestedFilename()).toContain("INFRO-reconciliation");
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath("laundry-bank-mobile.png"),fullPage:true});
      await setSession(page,outsider.sessionToken);const denied=await page.request.post(request.url(),replay);expect(await denied.text()).toContain("المنشأة النشطة");
    } finally {
      await page.close();await db.session.deleteMany({where:{userId:fixture.userId}});
      await db.business.update({where:{id:fixture.businessId},data:{deletedAt:new Date(),isPublished:false}});
      await cleanup(outsider);
    }
  });

  test("laundry owner manages staff and enables approved ready notifications on mobile",async({browser},testInfo)=>{
    test.setTimeout(120000);
    const fixture=await seed(),employee=await seed();const page=await browser.newPage({viewport:{width:390,height:844}}),staff=await browser.newPage();
    try{
      await db.user.update({where:{id:employee.userId},data:{name:"موظف المغسلة التجريبي"}});
      const member=await db.businessMember.create({data:{businessId:fixture.businessId,userId:employee.userId,role:"viewer",permissions:["laundry"],status:"active"}});
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/Laundromat/Staff`);
      await expect(page.getByRole("heading",{name:"إضافة موظف جديد",exact:true})).toBeVisible();
      const details=page.locator("details").filter({hasText:"موظف المغسلة التجريبي"});await details.locator("summary").click();
      await details.getByLabel("المحاسبة — الدفتر والاشتراكات والموردون",{exact:true}).check();
      await details.getByRole("button",{name:"حفظ صلاحيات الموظف",exact:true}).click();
      await expect.poll(async()=>(await db.businessMember.findUniqueOrThrow({where:{id:member.id}})).permissions).toEqual(["laundryAccounting","laundry"]);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath("laundry-staff-mobile.png"),fullPage:true});
      await setSession(staff,employee.sessionToken);await staff.context().addCookies([{name:"hee_active_business",value:fixture.businessId,url:baseUrl}]);
      await staff.goto(`${baseUrl}/Laundromat/Staff`);await expect(staff.getByRole("heading",{name:"إدارة الموظفين متاحة لمالك المنشأة فقط",exact:true})).toBeVisible();
      await staff.goto(`${baseUrl}/Laundromat/Notifications`);await expect(staff.getByRole("heading",{name:"إعدادات الإشعارات متاحة لمالك المنشأة فقط",exact:true})).toBeVisible();
      const plan=await db.businessPlan.upsert({where:{code:"BUSINESS"},update:{},create:{code:"BUSINESS",name:"Business",monthlyPrice:100,productLimit:10}});
      await db.subscription.updateMany({where:{businessId:fixture.businessId},data:{planId:plan.id}});
      const connection=await db.whatsAppConnection.create({data:{businessId:fixture.businessId,provider:"meta",status:"connected",marketingEnabled:true,wabaId:crypto.randomUUID(),phoneNumberId:crypto.randomUUID(),credentialEnvelope:{}}});
      const template=await db.whatsAppTemplate.create({data:{businessId:fixture.businessId,connectionId:connection.id,providerTemplateId:crypto.randomUUID(),name:"infro_laundry_ready",language:"ar",category:"utility",status:"approved",providerStatus:"APPROVED",components:[{type:"BODY",text:"مرحبًا {{1}} طلب {{3}} جاهز لدى {{2}}"}],rawPayload:{},lastSyncedAt:new Date()}});
      await page.goto(`${baseUrl}/Laundromat/Notifications`);
      const readyForm=page.locator("form").filter({has:page.getByRole("heading",{name:"إشعار جاهزية الطلب",exact:true})});
      await expect(readyForm.getByLabel("تفعيل إشعار جاهزية الطلب تلقائيًا",{exact:true})).not.toBeChecked();
      await readyForm.getByLabel("قالب واتساب المعتمد",{exact:true}).selectOption(template.id);await readyForm.getByLabel("تفعيل إشعار جاهزية الطلب تلقائيًا",{exact:true}).check();
      await readyForm.getByRole("button",{name:"حفظ إعدادات الإشعار",exact:true}).click();
      await expect(readyForm.getByRole("status").filter({hasText:"تم تفعيل"})).toBeVisible();
      await expect(readyForm.getByLabel("قالب واتساب المعتمد",{exact:true})).toHaveValue(template.id);
      await expect(readyForm.getByLabel("تفعيل إشعار جاهزية الطلب تلقائيًا",{exact:true})).toBeChecked();
      expect((await db.whatsAppAutomation.findFirstOrThrow({where:{businessId:fixture.businessId,triggerType:"laundry_ready"}})).status).toBe("active");
      expect(await db.whatsAppAutomationEvent.count({where:{businessId:fixture.businessId}})).toBe(0);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath("laundry-notifications-mobile.png"),fullPage:true});
      // Exercise the real status action: one consented order queues once; the other never queues.
      for(const consent of [true,false]){
        const id=crypto.randomUUID();const number=consent?1:2;
        await db.$executeRaw`INSERT INTO "LaundryTicket" (id,"businessId",number,"requestId","customerName",phone,items,total,paid,status,"dueAt","createdBy","readyNotifyConsentAt") VALUES (${id},${fixture.businessId},${number},${crypto.randomUUID()},'عميل اختبار إشعار','+966500009940','[]'::jsonb,100,100,'processing',now(),${fixture.userId},${consent?new Date():null})`;
        await page.goto(`${baseUrl}/Laundromat`);await openLaundrySection(page,"الطلبات والتسليم");
        const row=page.locator(".ld-orders-table tbody tr").filter({hasText:`#${String(number).padStart(5,"0")}`});
        await row.getByRole("button",{name:"التفاصيل والفاتورة",exact:true}).click();
        const sent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
        await page.getByRole("button",{name:"المرحلة التالية: جاهز للاستلام",exact:true}).click();const request=await sent;
        await expect(page.getByRole("button",{name:"المرحلة التالية: جاهز للاستلام",exact:true})).toHaveCount(0);
        await page.request.post(request.url(),{headers:{"next-action":request.headers()["next-action"],"content-type":request.headers()["content-type"],origin:new URL(baseUrl).origin},data:request.postData()??""});
        expect(await db.whatsAppAutomationEvent.count({where:{businessId:fixture.businessId}})).toBe(1);
      }
      await page.goto(`${baseUrl}/Laundromat/Notifications`);
      await readyForm.getByLabel("تفعيل إشعار جاهزية الطلب تلقائيًا",{exact:true}).uncheck();await readyForm.getByRole("button",{name:"حفظ إعدادات الإشعار",exact:true}).click();await expect(readyForm.getByRole("status").filter({hasText:"تم إيقاف"})).toBeVisible();
    }finally{await page.close();await staff.close();await db.businessMember.deleteMany({where:{businessId:fixture.businessId}});await cleanup(fixture);await cleanup(employee);}
  });

  test("laundry cashier persists exact amounts, rejects cross-tenant replay, and prints saved orders", async ({browser},testInfo)=>{
    test.setTimeout(180000);
    const fixture=await seed();const outsider=await seed();const page=await browser.newPage({viewport:{width:1440,height:1000}});
    try{
      // Historical expenses exercise more than one resumable backfill batch without inventing a cash source.
      for(let i=0;i<26;i++)await db.$executeRaw`INSERT INTO "LaundryExpense" ("id","businessId","requestId","description","amount","createdBy","createdAt") VALUES (${crypto.randomUUID()},${fixture.businessId},${crypto.randomUUID()},'مصروف سابق تجريبي',100,${fixture.userId},now()-interval '1 day')`;
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/Laundromat`);
      await openLaundrySection(page,"دفتر المحاسبة");
      await page.getByRole("button",{name:"تهيئة الدفتر من العمليات المسجلة",exact:true}).click();
      await expect(page.getByRole("heading",{name:"ميزان المراجعة ودليل الحسابات",exact:true})).toBeVisible();

      await openLaundrySection(page,"العملاء");
      await page.getByLabel("اسم صاحب الملف",{exact:true}).fill("عميل اختبار المغسلة");
      await page.getByLabel("جوال صاحب الملف",{exact:true}).fill("٠٥٠٠٠٠٩٩٤٠");
      await page.getByRole("button",{name:"حفظ ملف العميل",exact:true}).click();
      await expect(page.getByText("تم حفظ ملف العميل",{exact:true})).toBeVisible();
      await openLaundrySection(page,"الخدمات والأسعار");
      await page.getByLabel("سعر فنيلة داخلية — غسيل وكوي",{exact:true}).fill("2.50");
      await page.getByLabel("سعر سروال داخلي — غسيل وكوي",{exact:true}).fill("3.00");
      await page.getByLabel("سعر فنيلة داخلية — كوي فقط",{exact:true}).fill("1.25");
      const catalogSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"إضافة الأصناف المسعّرة إلى الكاشير",exact:true}).click();
      const catalogRequest=await catalogSent;
      await expect(page.locator(".ld-service-row").filter({hasText:"فنيلة داخلية — غسيل وكوي"})).toHaveCount(1);
      await page.request.post(catalogRequest.url(),{headers:{"next-action":catalogRequest.headers()["next-action"],"content-type":catalogRequest.headers()["content-type"],origin:new URL(baseUrl).origin},data:catalogRequest.postData()??""});
      const presetRows=await db.$queryRaw<Array<{price:number}>>`SELECT "price" FROM "LaundryService" WHERE "businessId"=${fixture.businessId} AND "name"='فنيلة داخلية — غسيل وكوي'`;
      expect(presetRows).toEqual([{price:250}]);
      const allPresets=await db.$queryRaw<Array<{count:number}>>`SELECT COUNT(*)::int AS count FROM "LaundryService" WHERE "businessId"=${fixture.businessId}`;
      expect(allPresets[0].count).toBe(3);
      await expect(page.getByLabel("سعر فنيلة داخلية — غسيل وكوي",{exact:true})).toHaveCount(0);
      await page.getByLabel("اسم الصنف",{exact:true}).fill("ثوب");
      await page.getByLabel("التصنيف",{exact:true}).fill("ملابس رجالية");
      await page.getByLabel("سعر غسيل وكوي",{exact:true}).fill("5.25");
      await page.getByLabel("سعر كوي فقط",{exact:true}).fill("2.25");
      await page.getByRole("button",{name:"إضافة الصنف",exact:true}).click();
      await expect(page.getByText("تم حفظ العملية بنجاح",{exact:true})).toBeVisible();
      await openLaundrySection(page,"الكاشير");
      const product=page.locator(".ld-product-card").filter({has:page.getByRole("heading",{name:"ثوب",exact:true})});
      await expect(product).toHaveCount(1);
      const operationTabs=page.getByRole("navigation",{name:"نوع خدمة المغسلة"});
      await operationTabs.getByRole("button",{name:"كوي فقط",exact:true}).click();
      await expect(page.locator(".ld-product-options button").filter({hasText:"غسيل وكوي"})).toHaveCount(0);
      await expect(page.locator(".ld-product-card").filter({hasText:"سروال داخلي"})).toHaveCount(0);
      await product.getByRole("button",{name:"إضافة ثوب — كوي",exact:true}).click();
      await operationTabs.getByRole("button",{name:"غسيل وكوي",exact:true}).click();
      await expect(page.locator(".ld-cart-lines")).toContainText("ثوب — كوي");
      await expect(product.getByRole("button",{name:"إضافة ثوب — كوي",exact:true})).toHaveCount(0);
      await product.getByRole("button",{name:"إضافة ثوب — غسيل وكوي",exact:true}).click();
      for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:1000}]){
        await page.setViewportSize(viewport);
        await page.getByLabel("البحث عن صنف",{exact:true}).fill("ثوب");
        await expect(page.locator(".ld-product-card")).toHaveCount(1);
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
        const target=await product.getByRole("button",{name:"إضافة ثوب — غسيل وكوي",exact:true}).boundingBox();
        expect(target?.height).toBeGreaterThanOrEqual(44);
        if(viewport.width===390){
          await expect(page.locator(".ld-cart")).toBeHidden();
          await page.getByRole("button",{name:/مراجعة الطلب/}).click();
          await expect(page.getByLabel("اسم العميل",{exact:true})).toBeVisible();
          await expect(page.locator(".ld-cart-lines")).toContainText("ثوب — كوي");
          await page.getByRole("button",{name:"العودة إلى الأصناف",exact:true}).click();
        }
        await page.screenshot({path:testInfo.outputPath(`laundry-responsive-${viewport.width}.png`),fullPage:true});
      }
      await page.getByLabel("البحث عن صنف",{exact:true}).fill("");
      await page.getByLabel("اسم العميل",{exact:true}).fill("عميل اختبار المغسلة");
      await page.getByLabel("رقم الجوال",{exact:true}).fill("0500009940");
      await page.getByRole("button",{name:"استدعاء العميل بالجوال",exact:true}).click();
      await expect(page.getByText("تم استدعاء العميل المحفوظ",{exact:true})).toBeVisible();
      await expect(page.getByLabel("اسم العميل",{exact:true})).toHaveValue("عميل اختبار المغسلة");
      await setCashierDelivery(page,2,16);
      await page.getByLabel("الدفعة المستلمة",{exact:true}).fill("5.25");
      await page.screenshot({path:testInfo.outputPath("laundry-cashier-desktop.png"),fullPage:true});
      const sent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"حفظ الطلب وإصدار المستند",exact:true}).click();const request=await sent;
      await expect(page.getByRole("heading",{name:"فاتورة",exact:true})).toBeVisible();
      await page.getByRole("button",{name:"إغلاق",exact:true}).click();
      await expect(page.getByRole("button",{name:"التفاصيل والفاتورة",exact:true})).toBeVisible();
      const replay=()=>page.request.post(request.url(),{headers:{"next-action":request.headers()["next-action"],"content-type":request.headers()["content-type"],origin:new URL(baseUrl).origin},data:request.postData()??""});
      await replay();
      const rows=await db.$queryRaw<Array<{id:string;total:number;paid:number;status:string}>>`SELECT "id","total","paid","status" FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId}`;
      expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({total:750,paid:525,status:"received"});
      await page.goto(`${baseUrl}/Laundromat?q=0500009940`);
      await expect(page.getByRole("button",{name:"التفاصيل والفاتورة",exact:true})).toHaveCount(1);
      await db.$executeRaw`UPDATE "LaundryTicket" SET "dueAt"=now()-interval '1 hour' WHERE "businessId"=${fixture.businessId} AND "id"=${rows[0].id}`;
      await page.goto(`${baseUrl}/Laundromat?filter=overdue`);
      await expect(page.getByRole("button",{name:"التفاصيل والفاتورة",exact:true})).toHaveCount(1);
      await page.getByRole("link",{name:"جاهزة للاستلام",exact:true}).click();
      await expect(page.getByRole("button",{name:"التفاصيل والفاتورة",exact:true})).toHaveCount(0);
      await page.getByRole("link",{name:"غير مسددة",exact:true}).click();
      await expect(page.getByRole("button",{name:"التفاصيل والفاتورة",exact:true})).toHaveCount(1);
      await page.getByRole("link",{name:"جميع الطلبات",exact:true}).click();
      await page.getByRole("button",{name:"التفاصيل والفاتورة",exact:true}).click();
      await expect(page.getByRole("heading",{name:"فاتورة",exact:true})).toBeVisible();
      await expect(page.locator(".ld-receipt tbody tr")).toHaveCount(2);
      await expect(page.locator(".ld-receipt")).toContainText("ثوب — كوي");
      await page.getByLabel("دفعة إضافية",{exact:true}).fill("2.25");await page.getByRole("button",{name:"تسجيل الدفعة",exact:true}).click();
      await expect(page.getByLabel("دفعة إضافية",{exact:true})).toHaveCount(0);
      for(const status of ["قيد المعالجة","جاهز للاستلام","تم التسليم"]){await page.getByRole("button",{name:`المرحلة التالية: ${status}`,exact:true}).click();await expect(page.getByRole("button",{name:`المرحلة التالية: ${status}`,exact:true})).toHaveCount(0);}
      await page.setViewportSize({width:390,height:844});await page.screenshot({path:testInfo.outputPath("laundry-invoice-mobile.png"),fullPage:true});
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await page.getByLabel("مقاس الطباعة",{exact:true}).selectOption("thermal");
      await expect(page.locator(".ld-receipt")).not.toContainText("لا تُحتسب ضريبة على هذه الفاتورة");
      await page.emulateMedia({media:"print"});
      await expect(page.locator(".ld-dialog-tools").first()).toBeHidden();
      await expect(page.locator(".ld-print-help")).toBeHidden();
      expect(await page.locator(".ld-receipt").evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      expect(await page.locator(".ld-receipt").evaluate(el=>el.getBoundingClientRect().width)).toBeCloseTo(72*96/25.4,0);
      await page.emulateMedia({media:"screen"});
      await page.getByLabel("مقاس الطباعة",{exact:true}).selectOption("a4");
      await page.emulateMedia({media:"print"});
      expect(await page.evaluate(()=>getComputedStyle(document.body).page)).toBe("laundry-a4");
      await page.emulateMedia({media:"screen"});
      await page.getByRole("button",{name:"إغلاق",exact:true}).click();
      await openLaundrySection(page,"التحصيل والمصروفات");
      await page.getByLabel("من تاريخ",{exact:true}).fill(riyadhDateKey(0));
      await page.getByLabel("إلى تاريخ",{exact:true}).fill(riyadhDateKey(0));
      const reportSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"عرض التقرير",exact:true}).click();
      const reportRequest=await reportSent;
      await expect(page.locator(".ld-report-summary")).toContainText("٧٫٥٠");
      await expect(page.locator(".ld-report-summary article").filter({hasText:"ذمم نهاية الفترة"})).toContainText("٠٫٠٠");
      await expect(page.locator(".ld-report tbody tr")).toHaveCount(2);
      await openLaundrySection(page,"شعار المنشأة");
      await page.getByLabel("رفع شعار المنشأة",{exact:true}).setInputFiles({name:"logo.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD0cAAAAASUVORK5CYII=","base64")});
      await page.getByRole("button",{name:"حفظ الشعار",exact:true}).click();
      await expect(page.getByText("تم حفظ شعار المنشأة",{exact:true})).toBeVisible();
      const branded=await db.business.findUnique({where:{id:fixture.businessId},select:{logoUrl:true}});
      expect(branded?.logoUrl).toMatch(/^\/api\/storage\//);
      const stored=await db.storedObject.findUnique({where:{id:branded!.logoUrl!.split("/").pop()!}});
      expect(stored?.folder).toBe(`logos/${fixture.businessId}`);
      await openLaundrySection(page,"الطلبات والتسليم");
      await page.getByRole("button",{name:"التفاصيل والفاتورة",exact:true}).click();
      await expect(page.getByAltText("شعار المنشأة في الفاتورة",{exact:true})).toBeVisible();
      await page.getByRole("button",{name:"إغلاق",exact:true}).click();
      await openLaundrySection(page,"دفتر المحاسبة");
      await expect(page.getByRole("heading",{name:"ميزان المراجعة ودليل الحسابات",exact:true})).toBeVisible();
      const sourceJournals=await db.$queryRaw<Array<{count:number}>>`SELECT COUNT(*)::int AS count FROM "LaundryJournal" WHERE "businessId"=${fixture.businessId}`;
      expect(sourceJournals[0].count).toBe(30);
      expect((await db.$queryRaw<Array<{balance:number}>>`SELECT SUM(credit-debit)::float8 AS balance FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId} AND "accountCode"='2900'`)[0].balance).toBe(2600);
      const ledgerBalances=await db.$queryRaw<Array<{accountCode:string;balance:number}>>`SELECT "accountCode",SUM(debit-credit)::float8 AS balance FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId} GROUP BY "accountCode"`;
      expect(ledgerBalances.find(a=>a.accountCode==="1200")?.balance).toBe(0);
      expect(ledgerBalances.find(a=>a.accountCode==="2200")?.balance).toBe(0);
      expect(ledgerBalances.find(a=>a.accountCode==="4000")?.balance).toBe(-750);
      await page.getByRole("button",{name:"قيد جديد",exact:true}).click();
      await page.getByLabel("بيان القيد",{exact:true}).fill("رصيد افتتاحي تجريبي موثق");
      await page.getByLabel("الحساب — سطر 1",{exact:true}).selectOption("1100");
      await page.getByLabel("الحساب — سطر 2",{exact:true}).selectOption("3000");
      await page.getByLabel("المبلغ — سطر 1",{exact:true}).fill("25");
      await page.getByLabel("المبلغ — سطر 2",{exact:true}).fill("24");
      await expect(page.getByRole("button",{name:"ترحيل القيد المتوازن",exact:true})).toBeDisabled();
      await expect(page.locator(".ld-journal-balance")).toContainText("أكمل مبالغ السطور");
      await page.getByLabel("المبلغ — سطر 2",{exact:true}).fill("25");
      const journalSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"ترحيل القيد المتوازن",exact:true}).click();const journalRequest=await journalSent;
      await expect(page.getByRole("button",{name:"عكس القيد",exact:true})).toBeVisible();
      await page.request.post(journalRequest.url(),{headers:{"next-action":journalRequest.headers()["next-action"],"content-type":journalRequest.headers()["content-type"],origin:new URL(baseUrl).origin},data:journalRequest.postData()??""});
      page.once("dialog",dialog=>dialog.accept("عكس تجريبي موثق"));
      await page.getByRole("button",{name:"عكس القيد",exact:true}).click();
      await expect(page.getByText("عُكس بقيد مستقل",{exact:true})).toBeVisible();
      const manualCount=await db.$queryRaw<Array<{count:number}>>`SELECT COUNT(*)::int AS count FROM "LaundryJournal" WHERE "businessId"=${fixture.businessId} AND ("sourceKey" LIKE 'manual:%' OR "sourceKey" LIKE 'reversal:%')`;
      expect(manualCount[0].count).toBe(2);
      // Database constraint rejects incomplete journals even if application validation is bypassed.
      const accountingClient=await pool.connect();
      try{
        await accountingClient.query("BEGIN");
        await accountingClient.query('INSERT INTO "LaundryJournal" (id,"businessId",number,"sourceKey",description,"effectiveAt","createdBy") VALUES ($1,$2,999,$3,$4,now(),$5)',[crypto.randomUUID(),fixture.businessId,"test-unbalanced","قيد مرفوض",fixture.userId]);
        await expect(accountingClient.query("COMMIT")).rejects.toThrow("LAUNDRY_JOURNAL_UNBALANCED");
      }finally{await accountingClient.query("ROLLBACK");accountingClient.release();}
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryJournal" WHERE "businessId"=${fixture.businessId} AND "sourceKey"='test-unbalanced'`)[0].n).toBe(0);
      await page.getByRole("button",{name:"إعدادات الدفتر",exact:true}).click();await page.getByText("إقفال فترة محاسبية",{exact:true}).click();
      await page.getByLabel("إقفال حتى نهاية يوم",{exact:true}).fill(riyadhDateKey(-1));
      await page.getByRole("checkbox",{name:"راجعت الفترة وأفهم أن الإقفال يمنع الترحيل إليها"}).check();
      await page.getByRole("button",{name:"إقفال الفترة السابقة",exact:true}).click();
      await expect(page.getByText(/آخر حد إقفال:/)).toBeVisible();
      await page.getByRole("button",{name:"قيد جديد",exact:true}).click();
      await page.getByLabel("تاريخ القيد",{exact:true}).fill(riyadhDateKey(-1));
      await page.getByLabel("بيان القيد",{exact:true}).fill("قيد مرفوض في فترة مقفلة");
      await page.getByLabel("المبلغ — سطر 1",{exact:true}).fill("1");
      await page.getByLabel("المبلغ — سطر 2",{exact:true}).fill("1");
      await page.getByRole("button",{name:"ترحيل القيد المتوازن",exact:true}).click();
      await expect(page.locator(".ld-ledger").getByRole("alert")).toContainText("الفترة المحاسبية مغلقة");
      await page.screenshot({path:testInfo.outputPath("laundry-ledger-mobile.png"),fullPage:true});
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await openLaundrySection(page,"العملاء");
      await page.getByRole("button",{name:"فتح ملف عميل اختبار المغسلة",exact:true}).click();
      await expect(page.getByRole("heading",{name:"طلبات العميل المرتبطة",exact:true})).toBeVisible();
      await expect(page.locator(".ld-customers")).toContainText("٧٫٥٠");
      const profiles=await db.$queryRaw<Array<{id:string;phone:string}>>`SELECT id,phone FROM "LaundryCustomer" WHERE "businessId"=${fixture.businessId}`;
      expect(profiles).toHaveLength(1);expect(profiles[0].phone).toBe("+966500009940");
      await page.getByLabel("اسم صاحب الملف",{exact:true}).fill("اسم ملف محدّث");
      const customerSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"حفظ ملف العميل",exact:true}).click();const customerRequest=await customerSent;
      await expect(page.getByText("تم حفظ ملف العميل",{exact:true})).toBeVisible();
      const snapshots=await db.$queryRaw<Array<{customerName:string}>>`SELECT "customerName" FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId}`;
      expect(snapshots[0].customerName).toBe("عميل اختبار المغسلة");
      // Simulate a historical unlinked receipt, then prove deduplication preserves the curated profile.
      await db.$executeRaw`UPDATE "LaundryTicket" SET "customerId"=NULL WHERE "businessId"=${fixture.businessId}`;
      await page.getByText("ربط الطلبات السابقة بملفات العملاء",{exact:true}).click();
      await page.getByRole("button",{name:"ربط الطلبات السابقة",exact:true}).click();
      await expect(page.locator(".ld-customers").getByRole("status")).toContainText("رُبط 1 طلبًا");
      expect((await db.$queryRaw<Array<{customerId:string}>>`SELECT "customerId" FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId}`)[0].customerId).toBe(profiles[0].id);
      await page.screenshot({path:testInfo.outputPath("laundry-customers-mobile.png"),fullPage:true});
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await setSession(page,outsider.sessionToken);await replay();
      const deniedCustomer=await page.request.post(customerRequest.url(),{headers:{"next-action":customerRequest.headers()["next-action"],"content-type":customerRequest.headers()["content-type"],origin:new URL(baseUrl).origin},data:customerRequest.postData()??""});
      expect(await deniedCustomer.text()).toContain("تعديل العملاء يتطلب صلاحية إشراف المنشأة النشطة");
      const deniedJournal=await page.request.post(journalRequest.url(),{headers:{"next-action":journalRequest.headers()["next-action"],"content-type":journalRequest.headers()["content-type"],origin:new URL(baseUrl).origin},data:journalRequest.postData()??""});
      expect(await deniedJournal.text()).toContain("دفتر الحسابات يتطلب صلاحية محاسبة المنشأة النشطة");
      const deniedReport=await page.request.post(reportRequest.url(),{headers:{"next-action":reportRequest.headers()["next-action"],"content-type":reportRequest.headers()["content-type"],origin:new URL(baseUrl).origin},data:reportRequest.postData()??""});
      expect(await deniedReport.text()).toContain("التقرير يتطلب صلاحية محاسبة المنشأة النشطة");
      const foreign=await db.$queryRaw<Array<{count:number}>>`SELECT COUNT(*)::int AS count FROM "LaundryTicket" WHERE "businessId"=${outsider.businessId}`;expect(foreign[0].count).toBe(0);
    }finally{
      await page.close();
      await db.$transaction(async tx=>{
        await tx.$executeRaw`DELETE FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId}`;
        await tx.$executeRaw`DELETE FROM "LaundryJournal" WHERE "businessId"=${fixture.businessId} AND "reversalOf" IS NOT NULL`;
        await tx.$executeRaw`DELETE FROM "LaundryJournal" WHERE "businessId"=${fixture.businessId}`;
        await tx.$executeRaw`DELETE FROM "LaundryAccount" WHERE "businessId"=${fixture.businessId}`;
        await tx.$executeRaw`DELETE FROM "LaundryBook" WHERE "businessId"=${fixture.businessId}`;
      });
      await db.$executeRaw`DELETE FROM "LaundryAudit" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryPayment" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryCustomer" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryExpense" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryService" WHERE "businessId"=${fixture.businessId}`;
      await cleanup(fixture);await cleanup(outsider);
      await db.storedObject.deleteMany({where:{folder:`logos/${fixture.businessId}`}});
    }
  });
  test("laundry prepaid purchases, redemptions and refunds reconcile and isolate tenants",async({browser},testInfo)=>{
    test.setTimeout(180000);
    const fixture=await seed(),outsider=await seed();const page=await browser.newPage({viewport:{width:390,height:844}});
    const customerId=crypto.randomUUID(),ticketId=crypto.randomUUID();
    try{
      await db.$executeRaw`INSERT INTO "LaundryCustomer" (id,"businessId",name,phone) VALUES (${customerId},${fixture.businessId},'عميل الاشتراك','+966500009941')`;
      await db.$executeRaw`INSERT INTO "LaundryTicket" (id,"businessId",number,"requestId","customerName",phone,"customerId",items,total,paid,"dueAt","createdBy") VALUES (${ticketId},${fixture.businessId},1,${crypto.randomUUID()},'عميل الاشتراك','+966500009941',${customerId},'[]'::jsonb,2500,0,now()+interval '1 day',${fixture.userId})`;
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/Laundromat`);
      await openLaundrySection(page,"دفتر المحاسبة");
      await page.getByRole("button",{name:"تهيئة الدفتر من العمليات المسجلة",exact:true}).click();
      await expect(page.getByRole("heading",{name:"ميزان المراجعة ودليل الحسابات",exact:true})).toBeVisible();
      await openLaundrySection(page,"اشتراكات العملاء");
      await page.getByLabel("جوال عميل مسجل",{exact:true}).fill("0500009941");
      await page.getByLabel("اسم الاشتراك",{exact:true}).fill("رصيد الغسيل الشهري");
      await page.getByLabel("قيمة الاشتراك المستلمة",{exact:true}).fill("100");
      await page.getByLabel("مدة الاشتراك",{exact:true}).selectOption("custom");
      await page.getByLabel("آخر يوم للاستخدام",{exact:true}).fill(riyadhDateKey(30));
      const sent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"حفظ الاشتراك والتحصيل",exact:true}).click();const purchase=await sent;
      await expect(page.locator(".ld-prepaid").getByRole("status")).toContainText("حُفظت العملية");
      const replay=(req:typeof purchase)=>page.request.post(req.url(),{headers:{"next-action":req.headers()["next-action"],"content-type":req.headers()["content-type"],origin:new URL(baseUrl).origin},data:req.postData()??""});
      await replay(purchase);
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryPrepaid" WHERE "businessId"=${fixture.businessId}`)[0].n).toBe(1);
      await page.getByRole("button",{name:"استخدام أو استرداد",exact:true}).click();
      await page.getByLabel("رقم طلب العميل",{exact:true}).fill("1");
      await page.getByLabel("مبلغ السداد من الاشتراك",{exact:true}).fill("26");
      await page.getByRole("button",{name:"سداد الطلب من الرصيد",exact:true}).click();
      await expect(page.locator(".ld-prepaid").getByRole("alert")).toContainText("يتجاوز المتبقي على الطلب");
      await page.getByLabel("مبلغ السداد من الاشتراك",{exact:true}).fill("25");
      const redemptionSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"سداد الطلب من الرصيد",exact:true}).click();const redemption=await redemptionSent;
      await expect(page.locator(".ld-prepaid").getByRole("status")).toContainText("حُفظت العملية");await replay(redemption);
      expect((await db.$queryRaw<Array<{paid:number}>>`SELECT paid FROM "LaundryTicket" WHERE id=${ticketId}`)[0].paid).toBe(2500);
      await page.getByText("استرداد رصيد غير مستخدم",{exact:true}).click();
      await page.getByLabel("المبلغ المعاد للعميل",{exact:true}).fill("75");
      await page.getByLabel("سبب ومرجع الاسترداد",{exact:true}).fill("إعادة الرصيد النقدي غير المستخدم");
      await page.getByRole("checkbox",{name:"أؤكد أن المبلغ أُعيد فعليًا للعميل"}).check();
      const refundSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"تسجيل استرداد الرصيد",exact:true}).click();const refund=await refundSent;
      await expect(page.locator(".ld-prepaid").getByRole("status")).toContainText("حُفظت العملية");await replay(refund);
      expect((await db.$queryRaw<Array<{remaining:number}>>`SELECT remaining FROM "LaundryPrepaid" WHERE "businessId"=${fixture.businessId}`)[0].remaining).toBe(0);
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryPrepaidMovement" WHERE "businessId"=${fixture.businessId}`)[0].n).toBe(3);
      const balances=await db.$queryRaw<Array<{accountCode:string;balance:number}>>`SELECT "accountCode",SUM(debit-credit)::float8 AS balance FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId} GROUP BY "accountCode"`;
      expect(balances.find(a=>a.accountCode==="1100")?.balance).toBe(2500);expect(balances.find(a=>a.accountCode==="2100")?.balance).toBe(0);expect(balances.find(a=>a.accountCode==="1200")?.balance).toBe(0);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await page.screenshot({path:testInfo.outputPath("laundry-prepaid-mobile.png"),fullPage:true});
      // Reusable packages work with the tenant's own service catalogue and auto-cover a new order.
      const packageService=crypto.randomUUID();
      await db.$executeRaw`INSERT INTO "LaundryService" (id,"businessId",name,category,price) VALUES (${packageService},${fixture.businessId},'خدمة الباقة','خدمات',2500)`;
      await page.reload();await openLaundrySection(page,"اشتراكات العملاء");
      await page.getByText("إضافة باقة جديدة",{exact:true}).click();
      await page.getByLabel("اسم الباقة",{exact:true}).fill("باقة الخدمة الشهرية");
      await page.getByLabel("سعر الباقة بالريال",{exact:true}).fill("100");
      await page.getByLabel("وصف الباقة وشروطها",{exact:true}).fill("رصيد لخدمات المنشأة المختارة");
      await page.getByRole("checkbox",{name:"خدمة الباقة · خدمات",exact:true}).check();
      await page.getByRole("button",{name:"حفظ الباقة",exact:true}).click();
      await page.getByRole("button",{name:"تسجيل مشترك في باقة الخدمة الشهرية",exact:true}).click();
      await page.getByLabel("جوال عميل مسجل",{exact:true}).fill("0500009941");
      await page.getByLabel("تاريخ بداية الاشتراك",{exact:true}).fill(riyadhDateKey(0));
      await page.getByRole("button",{name:"حفظ الاشتراك والتحصيل",exact:true}).click();
      await expect.poll(async()=>(await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int n FROM "LaundryPrepaid" WHERE "businessId"=${fixture.businessId} AND "packageId" IS NOT NULL`)[0].n).toBe(1);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await page.screenshot({path:testInfo.outputPath("laundry-subscriber-package-mobile.png"),fullPage:true});
      // Archiving stops new enrolments, not benefits already purchased.
      await page.getByRole("button",{name:"إيقاف الاشتراكات الجديدة",exact:true}).click();
      await expect(page.getByRole("button",{name:"تسجيل مشترك في باقة الخدمة الشهرية",exact:true})).toHaveCount(0);
      await openLaundrySection(page,"الكاشير");
      await page.locator('.ld-product-card').filter({hasText:'خدمة الباقة'}).getByRole('button').first().click();
      const review=page.getByRole("button",{name:/مراجعة الطلب/});if(await review.isVisible())await review.click();
      await page.getByLabel("اسم العميل",{exact:true}).fill("عميل الاشتراك");
      await page.getByLabel("رقم الجوال",{exact:true}).fill("0500009941");
      await setCashierDelivery(page,1,12);
      await page.getByLabel("الدفعة المستلمة",{exact:true}).fill("5");
      await expect(page.getByRole("region",{name:"اشتراكات العميل في الكاشير"})).toContainText("باقة الخدمة الشهرية");
      await expect(page.getByRole("button",{name:"حفظ الطلب وإصدار المستند",exact:true})).toBeEnabled();
      const autoSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"حفظ الطلب وإصدار المستند",exact:true}).click();const autoOrder=await autoSent;
      await expect(page.getByRole("dialog")).toBeVisible();await replay(autoOrder);
      expect((await db.$queryRaw<Array<{remaining:number}>>`SELECT remaining FROM "LaundryPrepaid" WHERE "businessId"=${fixture.businessId} AND "packageId" IS NOT NULL`)[0].remaining).toBe(8000);
      const autoPayments=await db.$queryRaw<Array<{method:string;amount:number}>>`SELECT p.method,p.amount FROM "LaundryPayment" p JOIN "LaundryTicket" t ON t.id=p."ticketId" WHERE p."businessId"=${fixture.businessId} AND t.number=2 ORDER BY method`;
      expect(autoPayments).toEqual([{method:"cash",amount:500},{method:"prepaid",amount:2000}]);
      await expect(page.locator('[aria-label="تفصيل الدفعات"]')).toContainText("اشتراك");
      await page.getByRole("button",{name:"إغلاق",exact:true}).click();

      // Counted service packages price each covered unit from the purchased value.
      await openLaundrySection(page,"اشتراكات العملاء");
      await page.getByText("إضافة باقة جديدة",{exact:true}).click();
      await page.getByLabel("نوع الباقة",{exact:true}).selectOption("pieces");
      await page.getByLabel("اسم الباقة",{exact:true}).fill("ثلاث قطع");
      await page.getByLabel("العدد المشمول",{exact:true}).fill("3");
      await page.getByLabel("سعر الباقة بالريال",{exact:true}).fill("10");
      await page.getByRole("radio",{name:"خدمة الباقة · خدمات",exact:true}).check();
      await page.getByRole("button",{name:"حفظ الباقة",exact:true}).click();
      await page.getByRole("button",{name:"تسجيل مشترك في ثلاث قطع",exact:true}).click();
      await page.getByLabel("جوال عميل مسجل",{exact:true}).fill("0500009941");
      await page.getByLabel("تاريخ بداية الاشتراك",{exact:true}).fill(riyadhDateKey(0));
      await page.getByRole("button",{name:"حفظ الاشتراك والتحصيل",exact:true}).click();
      await expect.poll(async()=>(await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int n FROM "LaundryPrepaid" WHERE "businessId"=${fixture.businessId} AND kind='pieces'`)[0].n).toBe(1);
      const counted=(await db.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryPrepaid" WHERE "businessId"=${fixture.businessId} AND kind='pieces'`)[0];
      await openLaundrySection(page,"الكاشير");
      await page.locator('.ld-product-card').filter({hasText:'خدمة الباقة'}).getByRole('button').first().click();
      if(await review.isVisible())await review.click();
      await page.getByLabel("اسم العميل",{exact:true}).fill("عميل الاشتراك");
      await page.getByLabel("رقم الجوال",{exact:true}).fill("0500009941");
      await setCashierDelivery(page,1,12);
      await expect(page.getByRole("region",{name:"اشتراكات العميل في الكاشير"})).toContainText("سيبقى 2 قطعة");
      const countedSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"حفظ الطلب وإصدار المستند",exact:true}).click();const countedOrder=await countedSent;
      await expect(page.getByRole("dialog")).toBeVisible();await Promise.all([replay(countedOrder),replay(countedOrder)]);
      expect((await db.$queryRaw<Array<{remaining:number;unitsRemaining:number}>>`SELECT remaining,"unitsRemaining" FROM "LaundryPrepaid" WHERE id=${counted.id}`)[0]).toEqual({remaining:667,unitsRemaining:2});
      expect((await db.$queryRaw<Array<{total:number;paid:number}>>`SELECT total,paid FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId} AND number=3`)[0]).toEqual({total:333,paid:333});
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int n FROM "LaundryPrepaidMovement" WHERE "prepaidId"=${counted.id} AND kind='redeem'`)[0].n).toBe(1);
      await expect(page.getByRole("dialog")).toContainText("ثلاث قطع");
      await page.screenshot({path:testInfo.outputPath("laundry-counted-package-receipt.png"),fullPage:true});
      const postModified=async(req:typeof purchase,patch:Record<string,unknown>)=>{
        const payload=JSON.parse(req.postData()!);Object.assign(payload[0],patch,{requestId:crypto.randomUUID()});
        return page.request.post(req.url(),{headers:{"next-action":req.headers()["next-action"],"content-type":req.headers()["content-type"],origin:new URL(baseUrl).origin},data:JSON.stringify(payload)});
      };
      const stale=await postModified(countedOrder,{});expect(await stale.text()).toContain("تغير رصيد الاشتراك");
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int n FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId}`)[0].n).toBe(3);
      const manualCounted=await postModified(redemption,{id:counted.id,amount:"1"});expect(await manualCounted.text()).toContain("تُستخدم تلقائيًا");
      const partialCounted=await postModified(refund,{id:counted.id,amount:"1"});expect(await partialCounted.text()).toContain("كامل القيمة غير المستخدمة");
      const fullCounted=await postModified(refund,{id:counted.id,amount:"6.67"});expect(await fullCounted.text()).not.toContain('"ok":false');
      expect((await db.$queryRaw<Array<{remaining:number;unitsRemaining:number}>>`SELECT remaining,"unitsRemaining" FROM "LaundryPrepaid" WHERE id=${counted.id}`)[0]).toEqual({remaining:0,unitsRemaining:0});
      const liability=(await db.$queryRaw<Array<{balance:number}>>`SELECT SUM(debit-credit)::float8 balance FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId} AND "accountCode"='2100'`)[0].balance;
      expect(liability).toBe(-8000);
      await page.getByRole("button",{name:"إغلاق",exact:true}).click();

      await openLaundrySection(page,"الموردون والمشتريات");
      await page.getByText("إضافة مورد جديد",{exact:true}).click();
      await page.getByLabel("اسم المورد",{exact:true}).fill("مورد التشغيل التجريبي");
      await page.getByRole("button",{name:"حفظ المورد",exact:true}).click();
      await expect(page.locator(".ld-purchases").getByRole("status")).toContainText("حُفظت عملية المورد");
      await page.getByLabel("مورد الفاتورة",{exact:true}).selectOption({label:"مورد التشغيل التجريبي"});
      await page.getByLabel("رقم فاتورة المورد",{exact:true}).fill("INV-001");
      await page.getByLabel("إجمالي الفاتورة الفعلي",{exact:true}).fill("60");
      await page.getByLabel("وصف الخدمة أو مواد الشراء",{exact:true}).fill("خدمة صيانة تشغيلية منفذة");
      const billSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"حفظ فاتورة المورد وترحيلها",exact:true}).click();const bill=await billSent;
      await expect(page.getByRole("button",{name:"سداد الفاتورة",exact:true})).toBeVisible();await replay(bill);
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryPurchase" WHERE "businessId"=${fixture.businessId}`)[0].n).toBe(1);
      await page.getByRole("button",{name:"سداد الفاتورة",exact:true}).click();
      await page.getByLabel("المبلغ المسدد للمورد",{exact:true}).fill("40");
      await page.getByLabel("مرجع السداد",{exact:true}).fill("سند دفع تجريبي 001");
      const paidSent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"تسجيل الدفعة للمورد",exact:true}).click();const paid=await paidSent;
      await expect(page.locator(".ld-purchases").getByRole("status")).toContainText("حُفظت عملية المورد");await replay(paid);
      expect((await db.$queryRaw<Array<{paid:number}>>`SELECT paid FROM "LaundryPurchase" WHERE "businessId"=${fixture.businessId}`)[0].paid).toBe(4000);
      const excessive=JSON.parse(paid.postData()!);excessive[0].amount="21";excessive[0].requestId=crypto.randomUUID();
      const rejected=await page.request.post(paid.url(),{headers:{"next-action":paid.headers()["next-action"],"content-type":paid.headers()["content-type"],origin:new URL(baseUrl).origin},data:JSON.stringify(excessive)});
      expect(await rejected.text()).toContain("الدفعة تتجاوز المتبقي للمورد");
      const supplierBalances=await db.$queryRaw<Array<{accountCode:string;balance:number}>>`SELECT "accountCode",SUM(debit-credit)::float8 AS balance FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId} GROUP BY "accountCode"`;
      expect(supplierBalances.find(a=>a.accountCode==="2000")?.balance).toBe(-2000);expect(supplierBalances.find(a=>a.accountCode==="5000")?.balance).toBe(6000);
      await page.getByRole("button",{name:"عرض سند الصرف",exact:true}).click();
      await expect(page.getByRole("dialog",{name:"سند العملية المالية"})).toContainText("سند دفع تجريبي 001");
      await page.getByLabel("مقاس طباعة السند",{exact:true}).selectOption("thermal");
      await page.emulateMedia({media:"print"});
      expect(await page.evaluate(()=>getComputedStyle(document.body).page)).toBe("laundry-thermal");
      await page.emulateMedia({media:"screen"});
      await page.getByRole("button",{name:"إغلاق السند",exact:true}).click();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await page.screenshot({path:testInfo.outputPath("laundry-purchases-mobile.png"),fullPage:true});

      await page.context().clearCookies();await setSession(page,outsider.sessionToken);
      const foreignLookup=await page.request.post(`${baseUrl}/api/accounting/subscriptions`,{data:{businessId:fixture.businessId,phone:"0500009941"}});
      expect((await foreignLookup.json()).ok).toBe(false);
      expect(await (await replay(autoOrder)).text()).toContain("تغيرت المنشأة النشطة");
      expect(await (await replay(purchase)).text()).toContain("إدارة الاشتراكات تتطلب صلاحية محاسبة المنشأة النشطة");
      expect(await (await replay(redemption)).text()).toContain("إدارة الاشتراكات تتطلب صلاحية محاسبة المنشأة النشطة");
      expect(await (await replay(refund)).text()).toContain("إدارة الاشتراكات تتطلب صلاحية محاسبة المنشأة النشطة");
      expect(await (await replay(bill)).text()).toContain("المشتريات تتطلب صلاحية محاسبة المنشأة النشطة");
      expect(await (await replay(paid)).text()).toContain("المشتريات تتطلب صلاحية محاسبة المنشأة النشطة");
    }finally{
      await page.close();
      await db.$executeRaw`DELETE FROM "LaundrySupplierPayment" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryPurchase" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundrySupplier" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryPrepaidMovement" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryPrepaid" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "AccountingPackage" WHERE "businessId"=${fixture.businessId}`;
      await db.$transaction(async tx=>{
        await tx.$executeRaw`DELETE FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId}`;
        await tx.$executeRaw`DELETE FROM "LaundryJournal" WHERE "businessId"=${fixture.businessId}`;
        await tx.$executeRaw`DELETE FROM "LaundryAccount" WHERE "businessId"=${fixture.businessId}`;
        await tx.$executeRaw`DELETE FROM "LaundryBook" WHERE "businessId"=${fixture.businessId}`;
      });
      await db.$executeRaw`DELETE FROM "LaundryAudit" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryPayment" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryService" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryCustomer" WHERE "businessId"=${fixture.businessId}`;
      await cleanup(fixture);await cleanup(outsider);
    }
  });
  test("laundry delivery restricts drivers to assigned jobs and posts delivery once",async({browser},testInfo)=>{
    test.setTimeout(120000);
    const fixture=await seed(),driver=await seed(),other=await seed();const page=await browser.newPage({viewport:{width:390,height:844}}),driverPage=await browser.newPage({viewport:{width:390,height:844}});
    const ticketId=crypto.randomUUID();
    try{
      await db.user.update({where:{id:driver.userId},data:{name:"مندوب المغسلة التجريبي"}});
      for(const f of [driver,other])await db.businessMember.create({data:{businessId:fixture.businessId,userId:f.userId,role:"viewer",status:"active",permissions:["laundryDelivery"]}});
      await db.$executeRaw`INSERT INTO "LaundryTicket" (id,"businessId",number,"requestId","customerName",phone,items,total,paid,status,"dueAt","createdBy") VALUES (${ticketId},${fixture.businessId},1,${crypto.randomUUID()},'عميل توصيل اختبار','+966500009942','[]'::jsonb,2500,2500,'ready',now()+interval '1 day',${fixture.userId})`;
      await db.$executeRaw`INSERT INTO "LaundryPayment" (id,"businessId","ticketId","requestId",amount,method,"createdBy") VALUES (${crypto.randomUUID()},${fixture.businessId},${ticketId},${crypto.randomUUID()},2500,'cash',${fixture.userId})`;
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/Laundromat`);
      await openLaundrySection(page,"دفتر المحاسبة");await page.getByRole("button",{name:"تهيئة الدفتر من العمليات المسجلة",exact:true}).click();await expect(page.getByRole("heading",{name:"ميزان المراجعة ودليل الحسابات",exact:true})).toBeVisible();
      await page.locator('.ld-mobile-nav button[aria-controls="laundry-navigation"]').click();await page.getByRole("link",{name:"إدارة التوصيل",exact:true}).click();
      await page.getByLabel("رقم الطلب الجاهز",{exact:true}).fill("1");await page.getByLabel("موظف التوصيل",{exact:true}).selectOption({label:"مندوب المغسلة التجريبي"});await page.getByLabel("عنوان وتعليمات التوصيل",{exact:true}).fill("الرياض — عنوان اصطناعي لاختبار التوصيل");await page.getByRole("checkbox",{name:"أكد العميل عنوانه ووافق على مشاركة بيانات التوصيل مع الموظف المسند"}).check();
      await page.getByRole("button",{name:"إسناد مهمة التوصيل",exact:true}).click();await expect(page.getByRole("heading",{name:"طلب #1 · عميل توصيل اختبار",exact:true})).toBeVisible();
      await setSession(driverPage,driver.sessionToken);await driverPage.context().addCookies([{name:"hee_active_business",value:fixture.businessId,url:baseUrl}]);await driverPage.goto(`${baseUrl}/Laundromat/Delivery`);
      await expect(driverPage.getByRole("heading",{name:"مهام التوصيل المسندة إليّ",exact:true})).toBeVisible();await expect(driverPage.getByRole("heading",{name:"إسناد طلب للتوصيل",exact:true})).toHaveCount(0);
      await driverPage.getByLabel("ملاحظة المهمة #1",{exact:true}).fill("انطلاق المندوب بالطلب");await driverPage.getByRole("button",{name:"حفظ تحديث الطلب #1",exact:true}).click();await expect(driverPage.getByText("في الطريق",{exact:true}).first()).toBeVisible();
      await driverPage.getByLabel("اسم مستلم الطلب #1",{exact:true}).fill("المستلم التجريبي");await driverPage.getByLabel("ملاحظة المهمة #1",{exact:true}).fill("سلمت القطع للمستلم المحدد");
      const sent=driverPage.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));await driverPage.getByRole("button",{name:"حفظ تحديث الطلب #1",exact:true}).click();const delivered=await sent;
      await expect(driverPage.getByText("اسم المستلم المسجل: المستلم التجريبي",{exact:true})).toBeVisible();
      const replay=()=>driverPage.request.post(delivered.url(),{headers:{"next-action":delivered.headers()["next-action"],"content-type":delivered.headers()["content-type"],origin:new URL(baseUrl).origin},data:delivered.postData()??""});await replay();
      expect((await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryJournal" WHERE "businessId"=${fixture.businessId} AND "sourceKey"=${`delivery:${ticketId}`}`)[0].n).toBe(1);
      expect((await db.$queryRaw<Array<{status:string}>>`SELECT status FROM "LaundryTicket" WHERE id=${ticketId}`)[0].status).toBe("delivered");
      expect(await horizontalOverflow(driverPage)).toBeLessThanOrEqual(1);await driverPage.screenshot({path:testInfo.outputPath("laundry-delivery-mobile.png"),fullPage:true});
      await driverPage.goto(`${baseUrl}/Laundromat`);await expect(driverPage.getByRole("heading",{name:"تحتاج صلاحية كاشير المنشأة",exact:true})).toBeVisible();
      await driverPage.goto(`${baseUrl}/Accounting`);await expect(driverPage.getByRole("heading",{name:"مهام التوصيل المسندة إليّ",exact:true})).toBeVisible();
      await driverPage.goto(`${baseUrl}/Accounting?view=cashier`);await expect(driverPage.getByRole("heading",{name:"هذه المهمة غير متاحة لحسابك",exact:true})).toBeVisible();
      await driverPage.context().clearCookies();await setSession(driverPage,other.sessionToken);await driverPage.context().addCookies([{name:"hee_active_business",value:fixture.businessId,url:baseUrl}]);await driverPage.goto(`${baseUrl}/Laundromat/Delivery`);await expect(driverPage.getByText("لا توجد مهام توصيل مسندة.",{exact:true})).toBeVisible();
      expect(await (await replay()).text()).toContain("العملية غير متاحة لهذا الحساب");
      await db.businessMember.updateMany({where:{businessId:fixture.businessId,userId:other.userId},data:{status:"suspended"}});await driverPage.reload();await expect(driverPage.getByRole("heading",{name:"طلب #1 · عميل توصيل اختبار",exact:true})).toHaveCount(0);expect(await (await replay()).text()).toContain("ليست لديك صلاحية توصيل لهذه المنشأة");
      await db.businessMember.updateMany({where:{businessId:fixture.businessId,userId:other.userId},data:{status:"active",permissions:["laundryAccounting"]}});
      await driverPage.goto(`${baseUrl}/Laundromat/Accounting`);await expect(driverPage.getByRole("heading",{name:"ميزان المراجعة ودليل الحسابات",exact:true})).toBeVisible();
      await driverPage.getByRole("button",{name:"قيد جديد",exact:true}).click();await driverPage.getByLabel("بيان القيد",{exact:true}).fill("قيد موظف الحسابات التجريبي");await driverPage.getByLabel("الحساب — سطر 1",{exact:true}).selectOption("1100");await driverPage.getByLabel("الحساب — سطر 2",{exact:true}).selectOption("3000");await driverPage.getByLabel("المبلغ — سطر 1",{exact:true}).fill("1");await driverPage.getByLabel("المبلغ — سطر 2",{exact:true}).fill("1");
      const accountingSent=driverPage.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));await driverPage.getByRole("button",{name:"ترحيل القيد المتوازن",exact:true}).click();const accountingRequest=await accountingSent;await expect(driverPage.getByRole("button",{name:"عكس القيد",exact:true})).toBeVisible();
      await driverPage.goto(`${baseUrl}/Laundromat/Operations`);await expect(driverPage.getByRole("heading",{name:"تحتاج صلاحية إشراف المغسلة",exact:true})).toBeVisible();
      await db.businessMember.updateMany({where:{businessId:fixture.businessId,userId:other.userId},data:{permissions:["laundryOperations"]}});
      await driverPage.reload();await expect(driverPage.getByRole("heading",{name:"إشراف المغسلة",exact:true})).toBeVisible();
      await driverPage.getByLabel("اسم صاحب الملف",{exact:true}).fill("عميل أنشأه المشرف");await driverPage.getByLabel("جوال صاحب الملف",{exact:true}).fill("0500009943");await driverPage.getByRole("button",{name:"حفظ ملف العميل",exact:true}).click();await expect(driverPage.getByText("تم حفظ ملف العميل",{exact:true})).toBeVisible();
      const deniedAccount=await driverPage.request.post(accountingRequest.url(),{headers:{"next-action":accountingRequest.headers()["next-action"],"content-type":accountingRequest.headers()["content-type"],origin:new URL(baseUrl).origin},data:accountingRequest.postData()??""});expect(await deniedAccount.text()).toContain("دفتر الحسابات يتطلب صلاحية محاسبة المنشأة النشطة");

    }finally{
      await page.close();await driverPage.close();await db.$executeRaw`DELETE FROM "LaundryDeliveryEvent" WHERE "businessId"=${fixture.businessId}`;await db.$executeRaw`DELETE FROM "LaundryDelivery" WHERE "businessId"=${fixture.businessId}`;
      await db.$transaction(async tx=>{await tx.$executeRaw`DELETE FROM "LaundryJournalLine" WHERE "businessId"=${fixture.businessId}`;await tx.$executeRaw`DELETE FROM "LaundryJournal" WHERE "businessId"=${fixture.businessId}`;await tx.$executeRaw`DELETE FROM "LaundryAccount" WHERE "businessId"=${fixture.businessId}`;await tx.$executeRaw`DELETE FROM "LaundryBook" WHERE "businessId"=${fixture.businessId}`;});
      await db.$executeRaw`DELETE FROM "LaundryAudit" WHERE "businessId"=${fixture.businessId}`;await db.$executeRaw`DELETE FROM "LaundryPayment" WHERE "businessId"=${fixture.businessId}`;await db.$executeRaw`DELETE FROM "LaundryTicket" WHERE "businessId"=${fixture.businessId}`;await db.$executeRaw`DELETE FROM "LaundryCustomer" WHERE "businessId"=${fixture.businessId}`;await db.businessMember.deleteMany({where:{businessId:fixture.businessId}});await cleanup(fixture);await cleanup(driver);await cleanup(other);
    }
  });
  test("laundry inventory preserves transfer totals, rejects negative and stale counts, and isolates tenants", async ({browser},testInfo)=>{
    test.setTimeout(120000);
    const fixture=await seed(),outsider=await seed();
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const other=await browser.newPage({viewport:{width:1024,height:768}});
    try{
      await setSession(page,fixture.sessionToken);await page.goto(`${baseUrl}/Laundromat`);
      await openLaundrySection(page,"المخزون والجرد");
      await page.getByText("إضافة مستودع",{exact:true}).click();
      for(const name of ["المستودع الرئيسي","مستودع الفرع"]){
        await page.getByLabel("اسم المستودع",{exact:true}).fill(name);
        await page.getByRole("button",{name:"حفظ المستودع",exact:true}).click();
        await expect(page.getByLabel("اسم المستودع",{exact:true})).toHaveValue("");
      }
      await page.getByText("إضافة مادة للمخزون",{exact:true}).click();
      await page.getByLabel("اسم المادة",{exact:true}).fill("سائل تنظيف تجريبي");
      await page.getByLabel("رمز المادة",{exact:true}).fill("SOAP-01");
      await page.getByLabel("وحدة المادة",{exact:true}).selectOption("liter");
      await page.getByLabel("حد إعادة الطلب لكل مستودع",{exact:true}).fill("5");
      await page.getByRole("button",{name:"حفظ المادة",exact:true}).click();
      await expect(page.getByLabel("اسم المادة",{exact:true})).toHaveValue("");
      const warehouses=await db.$queryRaw<Array<{id:string;name:string}>>`SELECT id,name FROM "LaundryWarehouse" WHERE "businessId"=${fixture.businessId}`;
      const source=warehouses.find(w=>w.name==="المستودع الرئيسي")!.id,destination=warehouses.find(w=>w.name==="مستودع الفرع")!.id;
      const item=(await db.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryStockItem" WHERE "businessId"=${fixture.businessId}`)[0].id;
      await page.getByLabel("مادة الحركة",{exact:true}).selectOption(item);
      await page.getByLabel("كمية الحركة",{exact:true}).fill("10.5");
      await page.getByLabel("سبب الحركة أو مرجع الاستلام",{exact:true}).fill("استلام تجريبي موثق");
      const sent=page.waitForRequest(r=>r.method()==="POST"&&Boolean(r.headers()["next-action"]));
      await page.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();const receiptRequest=await sent;
      await expect(page.getByLabel("كمية الحركة",{exact:true})).toHaveValue("");
      const replay=()=>page.request.post(receiptRequest.url(),{headers:{"next-action":receiptRequest.headers()["next-action"],"content-type":receiptRequest.headers()["content-type"],origin:new URL(baseUrl).origin},data:receiptRequest.postData()??""});
      await replay();
      expect((await db.$queryRaw<Array<{quantity:number}>>`SELECT quantity::float8 FROM "LaundryStockBalance" WHERE "businessId"=${fixture.businessId} AND "warehouseId"=${source}`)[0].quantity).toBe(10500);
      await page.getByLabel("نوع حركة المخزون",{exact:true}).selectOption("issue");
      await page.getByLabel("كمية الحركة",{exact:true}).fill("11");
      await page.getByLabel("سبب الحركة أو مرجع الاستلام",{exact:true}).fill("صرف يتجاوز المتاح");
      await page.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();
      await expect(page.getByRole("alert").filter({hasText:"الرصيد غير كافٍ"})).toBeVisible();
      await page.getByLabel("نوع حركة المخزون",{exact:true}).selectOption("transfer");
      await page.getByLabel("المستودع المستلم",{exact:true}).selectOption(destination);
      await page.getByLabel("كمية الحركة",{exact:true}).fill("2.25");
      await page.getByLabel("سبب الحركة أو مرجع الاستلام",{exact:true}).fill("تحويل تجريبي للفرع");
      await page.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();
      await expect(page.getByLabel("كمية الحركة",{exact:true})).toHaveValue("");
      await page.getByLabel("نوع حركة المخزون",{exact:true}).selectOption("count");
      await page.getByLabel("الكمية الفعلية بعد العد",{exact:true}).fill("8");
      await page.getByLabel("سبب الحركة أو مرجع الاستلام",{exact:true}).fill("جرد تجريبي بعد العد");
      await setSession(other,fixture.sessionToken);await other.goto(`${baseUrl}/Laundromat`);
      await openLaundrySection(other,"المخزون والجرد");
      await other.getByLabel("مادة الحركة",{exact:true}).selectOption(item);
      await other.getByLabel("نوع حركة المخزون",{exact:true}).selectOption("issue");
      await other.getByLabel("كمية الحركة",{exact:true}).fill("0.25");
      await other.getByLabel("سبب الحركة أو مرجع الاستلام",{exact:true}).fill("صرف متزامن أثناء الجرد");
      await other.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();
      await expect(other.getByLabel("كمية الحركة",{exact:true})).toHaveValue("");
      await page.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();
      await expect(page.getByRole("alert").filter({hasText:"تغير رصيد المادة"})).toBeVisible();
      await page.getByRole("button",{name:"تحديث المخزون",exact:true}).click();
      await expect(page.getByRole("button",{name:"تحديث المخزون",exact:true})).toBeEnabled();
      await page.getByRole("button",{name:"حفظ حركة المخزون",exact:true}).click();
      await expect(page.getByLabel("الكمية الفعلية بعد العد",{exact:true})).toHaveValue("");
      const totals=await db.$queryRaw<Array<{n:number}>>`SELECT SUM(quantity)::float8 AS n FROM "LaundryStockBalance" WHERE "businessId"=${fixture.businessId}`;expect(totals[0].n).toBe(10250);
      const moves=await db.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryStockMovement" WHERE "businessId"=${fixture.businessId}`;expect(moves[0].n).toBe(5);
      await page.screenshot({path:testInfo.outputPath("laundry-stock-mobile.png"),fullPage:true});expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await setSession(page,outsider.sessionToken);expect(await (await replay()).text()).toContain("المخزون يتطلب صلاحية إشراف المنشأة النشطة");
    }finally{
      await page.close();await other.close();
      await db.$executeRaw`DELETE FROM "LaundryStockMovement" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryStockBalance" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryStockItem" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryWarehouse" WHERE "businessId"=${fixture.businessId}`;
      await db.$executeRaw`DELETE FROM "LaundryAudit" WHERE "businessId"=${fixture.businessId}`;
      await cleanup(fixture);await cleanup(outsider);
    }
  });
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required");
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("visitor proof is tenant-bound, expires, limits guesses and reschedules one existing booking atomically", async ({request,browser},testInfo)=>{
    test.setTimeout(120000);
    const fixture=await seed();const outsider=await seed();
    try {
      await db.business.update({where:{id:fixture.businessId},data:{bookingSlotMinutes:60,bookingCapacity:1}});
      const customer=await db.customer.create({data:{businessId:fixture.businessId,name:"عميل تعديل الموعد",phone:"966500009930"}});
      // Disposable fixtures only: no credentials and no real provider sends.
      const connection = await db.whatsAppConnection.create({ data: { businessId: fixture.businessId, provider: "meta", status: "disconnected", wabaId: crypto.randomUUID(), phoneNumberId: crypto.randomUUID(), credentialEnvelope: {} } });
      await db.whatsAppAutomation.create({ data: { businessId: fixture.businessId, connectionId: connection.id, name: "Reschedule confirmation fixture", status: "active", triggerType: "booking_confirmation", triggerConfig: { version: 1 }, actionConfig: {}, createdByUserId: fixture.userId } });
      const contact = await db.whatsAppContact.create({ data: { businessId: fixture.businessId, phoneE164: "+966500009930", source: "api" } });
      const consent = await db.whatsAppConsent.create({ data: { businessId: fixture.businessId, customerId: customer.id, phoneE164: contact.phoneE164, source: "booking", evidence: "ci-booking-updates-opt-in", consentedAt: new Date() } });
      const storedNotes = `  إجابات نموذج الحجز: ${"تفاصيل محفوظة ".repeat(150)}  `;
      const booking=await db.booking.create({data:{businessId:fixture.businessId,customerId:customer.id,serviceId:fixture.serviceId,bookingDate:riyadhDateKey(2),bookingTime:"10:00",status:"confirmed",notes:storedNotes}});
      await db.$executeRaw`INSERT INTO "BookingDurationSnapshot" ("bookingId","durationMinutes") VALUES (${booking.id},60)`;
      const code="012345";
      async function acceptedChallenge() {
        const id=crypto.randomUUID();const current=await db.booking.findUniqueOrThrow({where:{id:booking.id}});
        const digest=bookingCredentialDigest("code",id,code,String(process.env.SESSION_SECRET));
        // Synthetic accepted provider receipt in disposable CI, never a live Meta delivery claim.
        await db.$executeRaw`INSERT INTO "BookingVisitorVerification" ("id","businessId","bookingId","bookingUpdatedAt","codeDigest","status","expiresAt","consentedAt","providerMessageId") VALUES (${id},${fixture.businessId},${booking.id},${current.updatedAt},${digest},'accepted',CURRENT_TIMESTAMP+INTERVAL '5 minutes',CURRENT_TIMESTAMP,'ci-only-provider-receipt')`;
        return id;
      }
      const verify=(id:string,value:string,slug=fixture.slug)=>request.post(`${baseUrl}/api/public/bookings/verification`,{data:{slug,operation:"verify",challengeId:id,code:value}});
      const exhausted=await acceptedChallenge();
      for(let n=0;n<5;n++)expect((await verify(exhausted,"999999")).status()).toBe(400);
      expect((await verify(exhausted,code)).status()).toBe(400);
      const expiredChallenge=await acceptedChallenge();
      await db.$executeRaw`UPDATE "BookingVisitorVerification" SET "createdAt"=CURRENT_TIMESTAMP-INTERVAL '10 minutes',"expiresAt"=CURRENT_TIMESTAMP-INTERVAL '5 minutes' WHERE "id"=${expiredChallenge}`;
      expect((await verify(expiredChallenge,code)).status()).toBe(400);
      const challenge=await acceptedChallenge();
      expect((await verify(challenge,code,outsider.slug)).status()).toBe(400);
      const proof=await verify(challenge,"٠١٢٣٤٥");expect(proof.status()).toBe(200);const access=(await proof.json()).access;
      expect((await verify(challenge,code)).status()).toBe(400);
      const availability=await request.get(`${baseUrl}/api/public/bookings?slug=${fixture.slug}&serviceId=${fixture.serviceId}`,{headers:{"x-booking-access":access}});
      expect((await availability.json()).days.find((day:{date:string})=>day.date===booking.bookingDate).slots).toContain("10:00");
      const other=await db.customer.create({data:{businessId:fixture.businessId,name:"عميل الفترة الممتلئة",phone:"966500009931"}});
      await db.booking.create({data:{businessId:fixture.businessId,customerId:other.id,serviceId:fixture.serviceId,bookingDate:booking.bookingDate,bookingTime:"12:00",status:"pending"}});
      const save=(time:string,key=crypto.randomUUID(),slug=fixture.slug)=>request.post(`${baseUrl}/api/public/bookings`,{headers:{"Idempotency-Key":key},data:{slug,manageAccess:access,bookingDate:booking.bookingDate,bookingTime:time,requestId:key,name:"tampered",phone:"0500000000"}});
      expect((await save("14:00",crypto.randomUUID(),outsider.slug)).status()).toBe(401);
      expect((await save("12:00")).status()).toBe(409);
      const key=crypto.randomUUID();const saved=await save("14:00",key);expect(saved.status()).toBe(200);expect(await saved.json()).toMatchObject({bookingId:booking.id,rescheduled:true});
      const current=await db.booking.findUniqueOrThrow({where:{id:booking.id}});expect(current).toMatchObject({customerId:customer.id,bookingTime:"14:00",status:"pending",createdAt:booking.createdAt,notes:storedNotes});
      expect(await db.booking.count({where:{businessId:fixture.businessId,customerId:customer.id}})).toBe(1);
      expect((await save("16:00",key)).status()).toBe(200);expect((await save("16:00")).status()).toBe(401);
      expect((await db.booking.findUniqueOrThrow({where:{id:booking.id}})).bookingTime).toBe("14:00");
      const notifications = await db.whatsAppAutomationEvent.findMany({ where: { businessId: fixture.businessId, subjectId: booking.id, subjectType: "booking.rescheduled" } });
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({ contactId: contact.id, externalEventId: `${booking.id}:rescheduled:${challenge}`, source: "ir.booking.confirmation" });
      expect((await db.whatsAppConsent.findUniqueOrThrow({ where: { id: consent.id } })).consentedAt).toEqual(consent.consentedAt);
      // OTP verification must never revive a revoked booking-update consent.
      await db.whatsAppConsent.update({ where: { id: consent.id }, data: { revokedAt: new Date() } });
      // Full visitor UI uses real verify/availability/save endpoints. Only initial send is a synthetic CI fixture.
      const uiChallenge=await acceptedChallenge();const page=await browser.newPage({viewport:{width:390,height:844}});
      try {
        await page.route("**/api/public/bookings/verification",async route=>{const data=route.request().postDataJSON();if(data.operation==="verify")await route.continue();else await route.fulfill({status:202,contentType:"application/json",body:JSON.stringify({ok:true,challengeId:uiChallenge,expiresInSeconds:300})});});
        await page.goto(`${baseUrl}/${fixture.slug}/booking`);
        await page.screenshot({path:testInfo.outputPath("visitor-booking-mobile-verification.png"),fullPage:true});
        await page.getByLabel("رقم واتساب",{exact:true}).fill("0500009930");
        await page.getByRole("checkbox").check();await page.getByRole("button",{name:"طلب رمز التحقق",exact:true}).click();
        await page.getByLabel("رمز التحقق",{exact:true}).fill(code);await page.getByRole("button",{name:"تحقق من الرمز",exact:true}).click();
        await expect(page.getByText(customer.name,{exact:true})).toBeVisible();
        await page.screenshot({path:testInfo.outputPath("visitor-booking-mobile-edit.png"),fullPage:true});
        await page.setViewportSize({width:1440,height:960});
        await page.screenshot({path:testInfo.outputPath("visitor-booking-desktop-edit.png"),fullPage:true});
        await page.setViewportSize({width:390,height:844});
        await page.getByLabel("تاريخ الزيارة",{exact:true}).selectOption(booking.bookingDate);await page.getByLabel("فترة الزيارة",{exact:true}).selectOption("16:00");
        await page.getByRole("button",{name:"حفظ الموعد الجديد",exact:true}).click();await expect(page.getByRole("heading",{name:"تم تعديل موعدك",exact:true})).toBeVisible();
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);expect(await db.booking.count({where:{businessId:fixture.businessId,customerId:customer.id}})).toBe(1);
      }finally{await page.close();}
      const racing=await acceptedChallenge();const racingProof=await verify(racing,code);const racingAccess=(await racingProof.json()).access;
      const concurrent=await Promise.all(["18:00","20:00"].map(bookingTime=>request.post(`${baseUrl}/api/public/bookings`,{headers:{"Idempotency-Key":crypto.randomUUID()},data:{slug:fixture.slug,manageAccess:racingAccess,bookingDate:booking.bookingDate,bookingTime}})));
      expect(concurrent.map(response=>response.status()).sort()).toEqual([200,401]);
      expect(await db.whatsAppAutomationEvent.count({ where: { businessId: fixture.businessId, subjectId: booking.id, subjectType: "booking.rescheduled" } })).toBe(1);
      expect((await db.whatsAppConsent.findUniqueOrThrow({ where: { id: consent.id } })).revokedAt).not.toBeNull();
      expect(await db.booking.count({where:{businessId:fixture.businessId,customerId:customer.id}})).toBe(1);
      const changed=await acceptedChallenge();const changedProof=await verify(changed,code);const changedAccess=(await changedProof.json()).access;
      await db.booking.update({where:{id:booking.id},data:{status:"cancelled"}});
      const stale=await request.post(`${baseUrl}/api/public/bookings`,{headers:{"Idempotency-Key":crypto.randomUUID()},data:{slug:fixture.slug,manageAccess:changedAccess,bookingDate:booking.bookingDate,bookingTime:"22:00"}});
      expect(stale.status()).toBe(401);
    }finally{await cleanup(fixture);await cleanup(outsider);}
  });

  test("appointment board separates elapsed pending visits and sorts received visits independently", async ({browser}) => {
    const fixture = await seed();
    const page = await browser.newPage({viewport:{width:390,height:844}});
    try {
      const branch = await db.branch.create({data:{businessId:fixture.businessId,name:"فرع المواعيد",isActive:true,bookingEnabled:true}});
      const customer = await db.customer.create({data:{businessId:fixture.businessId,name:"عميل ترتيب المواعيد",phone:"966500009920"}});
      const create = (bookingDate:string, bookingTime:string, createdAt:Date, branchId:string|null) => db.booking.create({data:{businessId:fixture.businessId,customerId:customer.id,serviceId:fixture.serviceId,branchId,bookingDate,bookingTime,status:"pending",createdAt}});
      const elapsed = await create(riyadhDateKey(-3),"10:00",new Date(Date.now()-3*86400000),null);
      const near = await create(riyadhDateKey(1),"10:00",new Date(Date.now()-60000),branch.id);
      const newest = await create(riyadhDateKey(2),"10:00",new Date(),branch.id);
      await setSession(page,fixture.sessionToken);
      await page.goto(`${baseUrl}/dashboard`);
      const nextVisit = page.getByRole("link").filter({hasText:"الموعد القادم"});
      await expect(nextVisit).toContainText(near.bookingDate);
      await expect(nextVisit).not.toContainText(elapsed.bookingDate);
      await page.goto(`${baseUrl}/dashboard/appointments`);
      const rows=page.locator("[data-booking-id]");
      await expect(rows).toHaveCount(2);
      await expect(rows.first()).toHaveAttribute("data-booking-id",near.id);
      await expect(page.locator(`[data-booking-id="${elapsed.id}"]`)).toHaveCount(0);
      await page.goto(`${baseUrl}/dashboard/appointments?tab=new`);
      await expect(rows.first()).toHaveAttribute("data-booking-id",newest.id);
      await page.goto(`${baseUrl}/dashboard/appointments?tab=history`);
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toHaveAttribute("data-booking-id",elapsed.id);
      await expect(page.getByRole("button",{name:"تأكيد الحجز",exact:true})).toHaveCount(0);
      await page.goto(`${baseUrl}/dashboard/appointments?branch=outsider-branch`);
      await expect(rows).toHaveCount(0);
      await expect(page.locator(".appointment-notice")).toContainText("غير موجود");
      await page.goto(`${baseUrl}/dashboard/appointments?tab=branches`);
      await expect(page.getByRole("heading",{name:branch.name,exact:true})).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    } finally { await page.close(); await cleanup(fixture); }
  });

  test("commerce eligibility gates real booking requests, concurrent capacity, and refund revocation", async ({ request }) => {
    const seeded = await seed();
    const date = riyadhDateKey(2);
    const phones = ["0500000311", "0500000312"];
    const post = (phone: string, bookingTime: string) => {
      const requestId = crypto.randomUUID();
      return request.post(`${baseUrl}/api/public/bookings`, { headers: { "Idempotency-Key": requestId }, data: { slug: seeded.slug, name: "عميل اختبار الأهلية", phone, serviceId: seeded.serviceId, bookingDate: date, bookingTime, requestId } });
    };
    try {
      await db.business.update({ where: { id: seeded.businessId }, data: { bookingSlotMinutes: 60, bookingCapacity: 1 } });
      // Isolated synchronization fixture, not a live provider or WhatsApp delivery claim.
      const integration = await db.whatsAppCommerceIntegration.create({ data: { businessId: seeded.businessId, provider: "salla", externalStoreId: `test-${seeded.businessId}`, status: "active", connectedAt: new Date(), credentialEnvelope: { testOnly: true } } });
      expect((await post(phones[0], "10:00")).status()).toBe(403);
      await db.commerceBookingEligibility.createMany({ data: phones.map((phone, index) => ({ businessId: seeded.businessId, integrationId: integration.id, provider: "salla", externalOrderId: `paid-${index}`, phoneE164: `+966${phone.slice(1)}`, eligible: true, paymentStatus: "paid", orderStatus: "confirmed", sourceEventId: `test-${index}` })) });
      for (const phoneE164 of ["966500000311", "\\966500000311", "+012345678", "+123"]) {
        await expect(db.commerceBookingEligibility.create({ data: { businessId: seeded.businessId, integrationId: integration.id, provider: "salla", externalOrderId: `invalid-${phoneE164}`, phoneE164, eligible: false, sourceEventId: "invalid-phone" } })).rejects.toThrow();
      }
      const attempts = await Promise.all(phones.map(phone => post(phone, "10:00")));
      expect(attempts.map(response => response.status()).sort()).toEqual([201, 409]);
      expect(await db.booking.count({ where: { businessId: seeded.businessId } })).toBe(1);
      await db.commerceBookingEligibility.updateMany({ where: { businessId: seeded.businessId }, data: { eligible: false, paymentStatus: "refunded", orderStatus: "cancelled" } });
      expect((await post(phones[0], "12:00")).status()).toBe(403);
      expect(await db.booking.count({ where: { businessId: seeded.businessId } })).toBe(1);
    } finally { await cleanup(seeded); }
  });

  test("a burst of ten bookings cannot exceed three available places", async ({ request }) => {
    const seeded = await seed();
    try {
      await db.business.update({ where: { id: seeded.businessId }, data: { bookingSlotMinutes: 60, bookingCapacity: 3 } });
      const responses = await Promise.all(Array.from({ length: 10 }, (_, index) => {
        const requestId = crypto.randomUUID();
        return request.post(`${baseUrl}/api/public/bookings`, {
          headers: { "Idempotency-Key": requestId },
          data: { slug: seeded.slug, phone: `05000008${String(index).padStart(2, "0")}`, serviceId: seeded.serviceId, bookingDate: riyadhDateKey(2), bookingTime: "10:00", requestId },
        });
      }));
      const statuses = responses.map((response) => response.status());
      expect(statuses.filter(status => status === 201)).toHaveLength(3);
      expect(statuses.filter(status => status === 409)).toHaveLength(7);
      expect(await db.booking.count({ where: { businessId: seeded.businessId, status: { in: ["pending", "confirmed"] } } })).toBe(3);
    } finally { await cleanup(seeded); }
  });

  test("merchant evening hours appear automatically and phone-only booking preserves customer identity", async ({ page, request }) => {
    const seeded = await seed();
    try {
      await db.business.update({ where: { id: seeded.businessId }, data: { bookingSlotMinutes: 30 } });
      await db.customer.create({ data: { businessId: seeded.businessId, name: "عميلنا المعروف", phone: "966500000411" } });
      await setSession(page, seeded.sessionToken);
      await page.goto(`${baseUrl}/dashboard/working-hours`, { waitUntil: "networkidle" });
      const tomorrow = riyadhDateKey(1);
      const day = dayIndexForRiyadhDate(tomorrow);
      const dayEditor = page.locator("fieldset").filter({ has: page.locator(`input[name="opens-${day}"]`) });
      await dayEditor.getByRole("button", { name: "مسائي 17:00–22:00", exact: true }).click();
      await expect(page.locator(`input[name="opens-${day}"]`)).toHaveValue("17:00");
      await page.locator(`input[name="opens-${day}"]`).fill("17:10");
      await page.locator(`input[name="closes-${day}"]`).fill("19:10");
      await page.getByRole("button", { name: "حفظ جدول الأسبوع", exact: true }).click();
      await page.waitForURL(/saved=1/);
      expect((await db.workingHours.findFirst({ where: { businessId: seeded.businessId, dayOfWeek: day } }))?.opensAt).toBe("17:10");
      const availability = await request.get(`${baseUrl}/api/public/bookings?slug=${seeded.slug}&serviceId=${seeded.serviceId}`);
      expect(availability.status()).toBe(200);
      const availableDay = (await availability.json()).days.find((item: { date: string }) => item.date === tomorrow);
      expect(availableDay.slots).toEqual(["17:10", "17:40", "18:10", "18:40"]);
      expect(JSON.stringify(availableDay)).not.toMatch(/capacity|remaining/i);
      const send = (time: string) => request.post(`${baseUrl}/api/public/bookings`, { data: { slug: seeded.slug, phone: "0500000411", serviceId: seeded.serviceId, bookingDate: tomorrow, bookingTime: time, notes: "ملاحظة اختبار", requestId: crypto.randomUUID() } });
      expect((await send("17:30")).status()).toBe(409);
      expect((await send("17:10")).status()).toBe(201);
      expect((await db.customer.findFirst({ where: { businessId: seeded.businessId, phone: "966500000411" } }))?.name).toBe("عميلنا المعروف");
      expect((await db.booking.findFirst({ where: { businessId: seeded.businessId } }))?.notes).toBe("ملاحظة اختبار");
    } finally { await cleanup(seeded); }
  });

  test("one active appointment per tenant and phone survives concurrent different-slot requests", async ({ request }) => {
    const seeded = await seed();
    try {
      await db.business.update({ where: { id: seeded.businessId }, data: { bookingSlotMinutes: 30 } });
      const date = riyadhDateKey(1);
      const send = (time: string, requestId = crypto.randomUUID(), phone = "0500000491") => request.post(`${baseUrl}/api/public/bookings`, { data: { slug: seeded.slug, phone, serviceId: seeded.serviceId, bookingDate: date, bookingTime: time, requestId } });
      const ids = [crypto.randomUUID(), crypto.randomUUID()];
      const responses = await Promise.all([send("10:00", ids[0]), send("11:00", ids[1], "+966500000491")]);
      expect(responses.map(r => r.status()).sort()).toEqual([201, 409]);
      const winner = responses.findIndex(r => r.status() === 201);
      expect((await responses[1 - winner].json()).code).toBe("ACTIVE_APPOINTMENT");
      expect((await send(winner === 0 ? "10:00" : "11:00", ids[winner])).status()).toBe(200);
      expect(await db.booking.count({ where: { businessId: seeded.businessId } })).toBe(1);
      await db.booking.updateMany({ where: { businessId: seeded.businessId }, data: { status: "cancelled" } });
      expect((await send("12:00")).status()).toBe(201);
      await db.booking.updateMany({ where: { businessId: seeded.businessId }, data: { bookingDate: riyadhDateKey(-2) } });
      expect((await send("13:00")).status()).toBe(201);
    } finally { await cleanup(seeded); }
  });

  test("service requests can be hidden and booking moved into the mobile ribbon", async ({ page }) => {
    const seeded = await seed();
    try {
      await setSession(page, seeded.sessionToken);
      const actions = [{ id: "share", enabled: false, sortOrder: 0 }];
      expect((await page.request.post(`${baseUrl}/api/dashboard/page-modules/bottom-actions`, { data: { actions, serviceRequestEnabled: false, bookingPlacement: "ribbon" } })).status()).toBe(200);
      // Older clients can reorder the ribbon without erasing the new settings.
      expect((await page.request.post(`${baseUrl}/api/dashboard/page-modules/bottom-actions`, { data: { actions } })).status()).toBe(200);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${baseUrl}/${seeded.slug}`, { waitUntil: "domcontentloaded" });
      const ribbon = page.locator("[data-public-action-ribbon]");
      await expect(ribbon.getByRole("button", { name: "حجز موعد", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "طلب خدمة", exact: true })).toHaveCount(0);
      await expect(page.getByRole("region", { name: "إجراءات الطلب والحجز" })).toHaveCount(0);
      await ribbon.getByRole("button", { name: "حجز موعد", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "إغلاق", exact: true }).click();
      await expect(ribbon.getByRole("button", { name: "حجز موعد", exact: true })).toBeFocused();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    } finally { await cleanup(seeded); }
  });

  test("global opt-out database accepts E164 and rejects malformed phones", async () => {
    const phone = "+966500000399";
    try {
      await db.$executeRaw`INSERT INTO "InfroReminderWhatsAppOptOut" ("phoneE164","source") VALUES (${phone}, 'admin_compliance')`;
      for (const invalid of ["966500000399", "\\966500000399", "+012345678", "+123"]) {
        await expect(db.$executeRaw`INSERT INTO "InfroReminderWhatsAppOptOut" ("phoneE164","source") VALUES (${invalid}, 'admin_compliance')`).rejects.toThrow();
      }
    } finally {
      await db.$executeRaw`DELETE FROM "InfroReminderWhatsAppOptOut" WHERE "phoneE164" IN (${phone}, '966500000399', ${"\\966500000399"}, '+012345678', '+123')`;
    }
  });

  test("creates a public booking and safely manages it from a mobile inbox", async ({ browser }) => {
    test.setTimeout(90_000);
    const seeded = await seed();
    const publicPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const ownerPage = await browser.newPage({ viewport: { width: 390, height: 844 } });

    try {
      await publicPage.goto(`${baseUrl}/${seeded.slug}`, { waitUntil: "domcontentloaded" });
      await expect(publicPage.getByText("الرياض", { exact: true })).toHaveCount(0);
      const requestButton = publicPage.getByRole("button", { name: "طلب خدمة" });
      await expect(requestButton).toBeVisible();
      await requestButton.click();
      const requestDialog = publicPage.getByRole("dialog", { name: "طلب خدمة" });
      await expect(requestDialog).toBeVisible();
      await expect(requestDialog.getByLabel("الاسم")).toBeFocused();
      expect(await publicPage.evaluate(() => document.body.style.overflow)).toBe("hidden");
      await publicPage.keyboard.press("Escape");
      await expect(requestDialog).toBeHidden();
      expect(await publicPage.evaluate(() => document.body.style.overflow)).toBe("");
      await expect(requestButton).toBeFocused();

      const bookingButton = publicPage.getByRole("button", { name: "حجز موعد" });
      await expect(bookingButton).toBeVisible();
      await bookingButton.click();
      const bookingDialog = publicPage.getByRole("dialog", { name: "حجز موعد" });
      await expect(bookingDialog).toBeVisible();
      await expect(bookingDialog.getByLabel("رقم الجوال")).toBeFocused();
      await expect(bookingDialog.getByLabel("الاسم", { exact: true })).toHaveCount(0);
      expect(await publicPage.evaluate(() => document.body.style.overflow)).toBe("hidden");
      const bookingClose = bookingDialog.getByRole("button", { name: "إغلاق" });
      const bookingCloseBox = await bookingClose.boundingBox();
      expect(bookingCloseBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(bookingCloseBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      await publicPage.keyboard.press("Escape");
      await expect(bookingDialog).toBeHidden();
      expect(await publicPage.evaluate(() => document.body.style.overflow)).toBe("");
      await expect(bookingButton).toBeFocused();

      await publicPage.setViewportSize({ width: 390, height: 520 });
      await bookingButton.click();
      await expect(bookingDialog).toBeVisible();
      const bookingBox = await bookingDialog.boundingBox();
      expect(bookingBox?.height ?? 9999).toBeLessThanOrEqual(496);
      const bookingSubmit = bookingDialog.getByRole("button", { name: "تأكيد الحجز" });
      await bookingSubmit.scrollIntoViewIfNeeded();
      await expect(bookingSubmit).toBeVisible();

      const tomorrow = riyadhDateKey(1);
      await bookingDialog.getByLabel("رقم الجوال").fill("0500000011");
      await expect(bookingDialog.getByLabel("الخدمة", { exact: true })).toHaveCount(0);
      const tomorrowButton = bookingDialog.locator(`[data-booking-date="${tomorrow}"]`);
      await expect(tomorrowButton).toBeEnabled({ timeout: 20_000 });
      await tomorrowButton.click();
      const tenOClock = bookingDialog.locator('[data-booking-time="10:00"]');
      await expect(tenOClock).toBeVisible();
      await tenOClock.click();
      await bookingSubmit.click();
      await expect(publicPage.getByText("تم تسجيل الحجز بنجاح وسيظهر مباشرة لدى المنشأة.")).toBeVisible({ timeout: 20_000 });

      const booking = await expect.poll(async () => db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { id: true, status: true, bookingDate: true, bookingTime: true } }), { timeout: 20_000 }).not.toBeNull();
      void booking;
      const persisted = await db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { id: true, status: true, bookingDate: true, bookingTime: true } });
      expect(persisted?.status).toBe("pending");
      expect(persisted?.bookingDate).toBe(tomorrow);
      expect(persisted?.bookingTime).toBe("10:00");

      const refreshedAvailability = await publicPage.request.get(
        `${baseUrl}/api/public/bookings?slug=${seeded.slug}&serviceId=${seeded.serviceId}`,
      );
      expect(refreshedAvailability.status()).toBe(200);
      const availabilityPayload = await refreshedAvailability.json() as { days: Array<{ date: string; available: boolean; slots: string[]; slotDetails: Array<{ start: string; end: string }> }> };
      const tomorrowAvailability = availabilityPayload.days.find((day) => day.date === tomorrow);
      expect(tomorrowAvailability?.available).toBe(true);
      expect(tomorrowAvailability?.slots).toContain("10:00");
      expect(tomorrowAvailability?.slotDetails.find((slot) => slot.start === "10:00")).toEqual({ start: "10:00", end: "12:00" });
      expect(tomorrowAvailability?.slotDetails.find((slot) => slot.start === "10:00")).not.toHaveProperty("remaining");
      expect(tomorrowAvailability?.slotDetails.find((slot) => slot.start === "10:00")).not.toHaveProperty("capacity");

      await setSession(ownerPage, seeded.sessionToken);
      await ownerPage.goto(`${baseUrl}/dashboard/appointments`, { waitUntil: "domcontentloaded" });
      const inboxMain = ownerPage.locator("#dashboard-main-content");
      await expect(inboxMain.getByRole("heading", { name: "المواعيد والحجوزات" })).toBeVisible();
      await expect(ownerPage.getByText("عميل الحجز", { exact: true })).toBeVisible();
      await expect(ownerPage.getByText("استشارة لمدة ساعة")).toBeVisible();
      await ownerPage.getByRole("button", { name: "تأكيد الحجز" }).click();
      await expect.poll(async () => (await db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { status: true } }))?.status, { timeout: 20_000 }).toBe("confirmed");
      await expect(ownerPage.getByText("مؤكد", { exact: true })).toBeVisible();

      const cancelButton = ownerPage.getByRole("button", { name: "إلغاء الحجز", exact: true });
      const cancelBox = await cancelButton.boundingBox();
      expect(cancelBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      ownerPage.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("إلغاء هذا الموعد");
        await dialog.dismiss();
      });
      await cancelButton.click();
      await expect.poll(async () => (await db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { status: true } }))?.status).toBe("confirmed");

      ownerPage.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("إلغاء هذا الموعد");
        await dialog.accept();
      });
      await cancelButton.click();
      await expect.poll(async () => (await db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { status: true } }))?.status, { timeout: 20_000 }).toBe("cancelled");
      await ownerPage.goto(`${baseUrl}/dashboard/appointments?tab=history`);
      await expect(ownerPage.getByText("ملغي", { exact: true })).toBeVisible();
    } finally {
      await publicPage.close();
      await ownerPage.close();
      await cleanup(seeded);
    }
  });

  test("lets the owner set a specific available or closed date and applies it publicly", async ({ browser, request }) => {
    test.setTimeout(60_000);
    const seeded = await seed();
    const closedDate = riyadhDateKey(1);
    const specialOpenDate = riyadhDateKey(2);
    const ownerPage = await browser.newPage({ viewport: { width: 390, height: 844 } });

    try {
      await db.bookingAvailabilityOverride.createMany({
        data: [
          { businessId: seeded.businessId, date: closedDate, isClosed: true, note: "إجازة" },
          { businessId: seeded.businessId, date: specialOpenDate, isClosed: false, opensAt: "13:00", closesAt: "15:00", note: "دوام خاص" },
        ],
      });

      const availability = await request.get(
        `${baseUrl}/api/public/bookings?slug=${seeded.slug}&serviceId=${seeded.serviceId}`,
      );
      expect(availability.status()).toBe(200);
      const payload = await availability.json() as { days: Array<{ date: string; available: boolean; slots: string[] }> };
      const closed = payload.days.find((day) => day.date === closedDate);
      const special = payload.days.find((day) => day.date === specialOpenDate);
      expect(closed).toEqual(expect.objectContaining({ available: false, slots: [] }));
      expect(special?.slots).toEqual(["13:00"]);

      const blockedId = crypto.randomUUID();
      const blocked = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": blockedId },
        data: { slug: seeded.slug, name: "عميل يوم مغلق", phone: "0500000301", serviceId: seeded.serviceId, bookingDate: closedDate, bookingTime: "10:00", requestId: blockedId },
      });
      expect(blocked.status()).toBe(409);
      expect((await blocked.json()).error).toContain("مغلق");

      const allowedId = crypto.randomUUID();
      const allowed = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": allowedId },
        data: { slug: seeded.slug, name: "عميل دوام خاص", phone: "0500000302", serviceId: seeded.serviceId, bookingDate: specialOpenDate, bookingTime: "13:00", requestId: allowedId },
      });
      expect(allowed.status()).toBe(201);

      await setSession(ownerPage, seeded.sessionToken);
      await ownerPage.goto(`${baseUrl}/dashboard/working-hours`, { waitUntil: "domcontentloaded" });
      await expect(ownerPage.locator("#dashboard-main-content").getByRole("heading", { name: "المواعيد والحجوزات", exact: true })).toBeVisible();
      await expect(ownerPage.getByRole("form", { name: "إضافة توفر لتاريخ محدد" })).toBeVisible();
      await expect(ownerPage.getByText("التواريخ الخاصة القادمة")).toBeVisible();
      await expect(ownerPage.getByText("دوام خاص")).toBeVisible();
      await expect.poll(() => horizontalOverflow(ownerPage)).toBeLessThanOrEqual(2);
    } finally {
      await ownerPage.close();
      await cleanup(seeded);
    }
  });

  test("uses independent slot duration and capacity for every branch", async ({ request }) => {
    const seeded = await seed();
    const date = riyadhDateKey(1);
    try {
      const [smallBranch, largeBranch] = await db.$transaction([
        db.branch.create({ data: { businessId: seeded.businessId, name: "فرع صغير", isActive: true, bookingEnabled: true, bookingSlotMinutes: 30, bookingCapacity: 1 } }),
        db.branch.create({ data: { businessId: seeded.businessId, name: "فرع كبير", isActive: true, bookingEnabled: true, bookingSlotMinutes: 120, bookingCapacity: 2 } }),
      ]);

      const availability = await request.get(`${baseUrl}/api/public/bookings?slug=${seeded.slug}&serviceId=${seeded.serviceId}&branchId=${largeBranch.id}`);
      expect(availability.status()).toBe(200);
      const payload = await availability.json() as { slotMinutes: number; days: Array<{ date: string; slotDetails: Array<{ start: string; end: string }> }> };
      expect(payload).toEqual(expect.objectContaining({ slotMinutes: 120 }));
      expect(payload).not.toHaveProperty("capacity");
      expect(payload.days.find((day) => day.date === date)?.slotDetails.find((slot) => slot.start === "08:00")).toEqual({ start: "08:00", end: "10:00" });

      const book = async (branchId: string, phone: string, bookingTime: string) => {
        const requestId = crypto.randomUUID();
        return request.post(`${baseUrl}/api/public/bookings`, {
          headers: { "Idempotency-Key": requestId },
          data: { slug: seeded.slug, name: `عميل ${phone}`, phone, serviceId: seeded.serviceId, branchId, bookingDate: date, bookingTime, requestId },
        });
      };

      expect((await book(smallBranch.id, "0500000401", "08:00")).status()).toBe(201);
      const smallFull = await book(smallBranch.id, "0500000402", "08:00");
      expect(smallFull.status()).toBe(409);
      expect((await smallFull.json()).error).toContain("اكتملت سعة");

      expect((await book(largeBranch.id, "0500000403", "08:00")).status()).toBe(201);
      expect((await book(largeBranch.id, "0500000404", "08:00")).status()).toBe(201);
      expect((await book(largeBranch.id, "0500000405", "08:00")).status()).toBe(409);
    } finally {
      await cleanup(seeded);
    }
  });

  test("keeps overnight slots aligned and enforces capacity atomically", async ({ request }) => {
    test.setTimeout(60_000);
    const seeded = await seed();
    const overnightDate = riyadhDateKey(2);
    const followingDate = riyadhDateKey(3);
    const overnightDay = dayIndexForRiyadhDate(overnightDate);

    try {
      await db.workingHours.updateMany({
        where: { businessId: seeded.businessId },
        data: { isClosed: true, opensAt: null, closesAt: null, secondOpensAt: null, secondClosesAt: null },
      });
      await db.business.update({ where: { id: seeded.businessId }, data: { bookingSlotMinutes: 120, bookingCapacity: 1 } });
      await db.workingHours.update({
        where: { businessId_dayOfWeek: { businessId: seeded.businessId, dayOfWeek: overnightDay } },
        data: { isClosed: false, opensAt: "20:00", closesAt: "02:00" },
      });

      const firstId = crypto.randomUUID();
      const first = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": firstId },
        data: { slug: seeded.slug, name: "عميل ليلي 1", phone: "0500000101", serviceId: seeded.serviceId, bookingDate: overnightDate, bookingTime: "22:00", requestId: firstId },
      });
      expect(first.status()).toBe(201);

      const conflictingId = crypto.randomUUID();
      const conflicting = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": conflictingId },
        data: { slug: seeded.slug, name: "عميل ليلي 2", phone: "0500000102", serviceId: seeded.serviceId, bookingDate: overnightDate, bookingTime: "22:00", requestId: conflictingId },
      });
      expect(conflicting.status()).toBe(409);
      expect((await conflicting.json()).error).toContain("اكتملت سعة");

      const allowedId = crypto.randomUUID();
      const allowed = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": allowedId },
        data: { slug: seeded.slug, name: "عميل ليلي 3", phone: "0500000103", serviceId: seeded.serviceId, bookingDate: followingDate, bookingTime: "00:00", requestId: allowedId },
      });
      expect(allowed.status()).toBe(201);

      const stored = await db.booking.findMany({ where: { businessId: seeded.businessId }, orderBy: [{ bookingDate: "asc" }, { bookingTime: "asc" }], select: { bookingDate: true, bookingTime: true } });
      expect(stored).toEqual([
        { bookingDate: overnightDate, bookingTime: "22:00" },
        { bookingDate: followingDate, bookingTime: "00:00" },
      ]);
    } finally {
      await cleanup(seeded);
    }
  });

  test("rejects impossible Gregorian booking dates before persistence", async ({ request }) => {
    const seeded = await seed();

    try {
      const requestId = crypto.randomUUID();
      const response = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": requestId },
        data: {
          slug: seeded.slug,
          name: "عميل تاريخ",
          phone: "0500000201",
          serviceId: seeded.serviceId,
          bookingDate: "2026-02-30",
          bookingTime: "10:00",
          requestId,
        },
      });
      expect(response.status()).toBe(400);
      expect(await db.booking.count({ where: { businessId: seeded.businessId } })).toBe(0);
      expect(await db.customer.count({ where: { businessId: seeded.businessId } })).toBe(0);
    } finally {
      await cleanup(seeded);
    }
  });

  test("rejects unsupported order types and delivery when the business disables it", async ({ request }) => {
    const seeded = await seed();

    try {
      await db.business.update({ where: { id: seeded.businessId }, data: { acceptOnlineOrders: true, deliveryAvailable: false } });
      const product = await db.product.create({ data: { businessId: seeded.businessId, name: "منتج اختبار", price: 2500, isActive: true } });

      const invalidId = crypto.randomUUID();
      const invalid = await request.post(`${baseUrl}/api/public/orders`, {
        headers: { "Idempotency-Key": invalidId },
        data: {
          slug: seeded.slug,
          name: "عميل طلب",
          phone: "0500000202",
          orderType: "courier",
          items: [{ productId: product.id, quantity: 1 }],
          requestId: invalidId,
        },
      });
      expect(invalid.status()).toBe(400);

      const deliveryId = crypto.randomUUID();
      const delivery = await request.post(`${baseUrl}/api/public/orders`, {
        headers: { "Idempotency-Key": deliveryId },
        data: {
          slug: seeded.slug,
          name: "عميل توصيل",
          phone: "0500000203",
          orderType: "delivery",
          items: [{ productId: product.id, quantity: 1 }],
          requestId: deliveryId,
        },
      });
      expect(delivery.status()).toBe(409);
      expect((await delivery.json()).error).toContain("التوصيل غير متاح");
      expect(await db.order.count({ where: { businessId: seeded.businessId } })).toBe(0);
      expect(await db.customer.count({ where: { businessId: seeded.businessId } })).toBe(0);
    } finally {
      await cleanup(seeded);
    }
  });
});
