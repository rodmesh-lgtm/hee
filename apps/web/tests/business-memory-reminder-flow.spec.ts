import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

type Workspace = { userId:string; businessId:string; sessionToken:string };
type Fixture = { a:Workspace; b:Workspace };
type NoteRow = { id:string; title:string };
type ReminderRow = { id:string; businessId:string; businessNoteId:string|null; status:string; deliveryChannels:string[]; progressPercent:number; completedAt:Date|null; workCompletedAt:Date|null };
let pool:Pool;
let db:PrismaClient;
let fixture:Fixture|null=null;

async function seedWorkspace(label:string):Promise<Workspace>{
  const suffix=`${Date.now()}-${label}-${Math.random().toString(36).slice(2,8)}`;
  const plan=await db.businessPlan.upsert({where:{code:"FREE"},update:{isActive:true},create:{code:"FREE",name:"Free",monthlyPrice:0,productLimit:3,isActive:true}});
  const user=await db.user.create({data:{name:`INFRO Flow ${label}`,email:`infro-flow-${suffix}@hee.test`,passwordHash:"flow-only",emailVerifiedAt:new Date()}});
  const business=await db.business.create({data:{ownerId:user.id,planId:plan.id,name:`منشأة تدفق ${label}`,slug:`infro-flow-${suffix}`,businessType:"خدمات أعمال",shortDescription:"اختبار تدفق ذاكرة الأعمال والتذكير",description:"بيانات اختبار مؤقتة",city:"الرياض",district:"العليا",isPublished:false,onboardingCompleted:true}});
  const sessionToken=crypto.randomUUID();
  await db.session.create({data:{token:sessionToken,userId:user.id,expiresAt:new Date(Date.now()+60*60*1000)}});
  return{userId:user.id,businessId:business.id,sessionToken};
}

async function noteByTitle(businessId:string,title:string){const result=await pool.query<NoteRow>('SELECT "id","title" FROM "BusinessNote" WHERE "businessId"=$1 AND "title"=$2 LIMIT 1',[businessId,title]);return result.rows[0]??null;}
async function linkedReminder(businessId:string,noteId:string){const result=await pool.query<ReminderRow>('SELECT "id","businessId","businessNoteId","status","deliveryChannels","progressPercent","completedAt","workCompletedAt" FROM "SmartReminder" WHERE "businessId"=$1 AND "businessNoteId"=$2 LIMIT 1',[businessId,noteId]);return result.rows[0]??null;}
async function noteCount(businessId:string,noteId:string){const result=await pool.query<{count:string}>('SELECT COUNT(*)::text AS "count" FROM "BusinessNote" WHERE "businessId"=$1 AND "id"=$2',[businessId,noteId]);return Number(result.rows[0]?.count??0);}
async function linkedReminderCount(businessId:string,noteId:string){const result=await pool.query<{count:string}>('SELECT COUNT(*)::text AS "count" FROM "SmartReminder" WHERE "businessId"=$1 AND "businessNoteId"=$2',[businessId,noteId]);return Number(result.rows[0]?.count??0);}

async function authenticatedContext(browser:Browser,token:string):Promise<BrowserContext>{const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addCookies([{name:"hee_session",value:token,url:baseUrl}]);return context;}
async function configureInAppReminder(page:import("@playwright/test").Page){await page.getByRole("button",{name:"بعد ساعة"}).click();const whatsapp=page.locator('input[name="deliveryChannels"][value="whatsapp"]');if(await whatsapp.isChecked().catch(()=>false))await whatsapp.uncheck();await page.locator('input[name="deliveryChannels"][value="in_app"]').check();}

test.describe.serial("Business Memory → Smart Reminder execution chain",()=>{
  test.beforeAll(async()=>{const connectionString=String(process.env.DATABASE_URL??"").trim();if(!connectionString)throw new Error("DATABASE_URL is required");pool=new Pool({connectionString,max:4});db=new PrismaClient({adapter:new PrismaPg(pool)});fixture={a:await seedWorkspace("A"),b:await seedWorkspace("B")};});
  test.afterAll(async()=>{await db?.$disconnect();await pool?.end();});

  test("creates a reviewed linked reminder, completes its work state, and blocks unsafe note deletion",async({browser})=>{
    if(!fixture)throw new Error("fixture missing");const context=await authenticatedContext(browser,fixture.a.sessionToken);const page=await context.newPage();
    try{
      await page.goto(`${baseUrl}/dashboard/notes`,{waitUntil:"domcontentloaded"});
      await expect(page.locator("#dashboard-main-content").getByRole("heading",{name:"مذكرات الأعمال",exact:true})).toBeVisible();
      await page.locator('input[name="title"]').first().fill("متابعة عرض عميل الاختبار");
      await page.locator('textarea[name="body"]').first().fill("تمت مناقشة العرض مع العميل ويجب متابعة الموافقة النهائية.");
      await page.locator('textarea[name="nextAction"]').first().fill("اتصل بالعميل وتأكد من الموافقة النهائية على العرض.");
      await page.getByRole("button",{name:"حفظ المذكرة ثم إعداد تذكير مرتبط"}).click();
      await expect(page).toHaveURL(/\/dashboard\/reminders\?.*noteId=/);
      await expect(page.getByText("ذاكرة الأعمال ← تذكير ذكي",{exact:true})).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue("متابعة عرض عميل الاختبار");
      await expect(page.locator('textarea[name="body"]')).toHaveValue("اتصل بالعميل وتأكد من الموافقة النهائية على العرض.");
      await configureInAppReminder(page);
      await page.getByRole("button",{name:"حفظ وتفعيل التذكير"}).click();
      await expect(page).toHaveURL(/create=success/);

      const note=await noteByTitle(fixture.a.businessId,"متابعة عرض عميل الاختبار");expect(note).not.toBeNull();
      let reminder=await linkedReminder(fixture.a.businessId,note!.id);expect(reminder).not.toBeNull();expect(reminder!.businessId).toBe(fixture.a.businessId);expect(reminder!.businessNoteId).toBe(note!.id);expect(reminder!.status).toBe("scheduled");expect(reminder!.deliveryChannels).toContain("in_app");

      const reminderCard=page.locator("article").filter({hasText:"متابعة عرض عميل الاختبار"});
      await reminderCard.getByRole("button",{name:"إنهاء التذكير"}).click();
      await expect(page).toHaveURL(/complete=success.*tab=completed/);
      reminder=await linkedReminder(fixture.a.businessId,note!.id);expect(reminder).not.toBeNull();expect(reminder!.status).toBe("completed");expect(reminder!.progressPercent).toBe(100);expect(reminder!.completedAt).not.toBeNull();expect(reminder!.workCompletedAt).not.toBeNull();

      await page.goto(`${baseUrl}/dashboard/notes`,{waitUntil:"domcontentloaded"});
      const noteCard=page.locator("article").filter({hasText:"متابعة عرض عميل الاختبار"});await noteCard.locator("summary").click();await noteCard.getByRole("button",{name:"حذف نهائي"}).click();
      await expect(page).toHaveURL(/delete=linked-reminder/);await expect(page.getByText("لا يمكن حذف هذه المذكرة نهائيًا لأنها مرتبطة بتذكير.",{exact:false})).toBeVisible();expect(await noteCount(fixture.a.businessId,note!.id)).toBe(1);
    }finally{await context.close()}
  });

  test("rejects a cross-tenant note id when another business attempts to create a linked reminder",async({browser})=>{
    if(!fixture)throw new Error("fixture missing");const note=await noteByTitle(fixture.a.businessId,"متابعة عرض عميل الاختبار");expect(note).not.toBeNull();const context=await authenticatedContext(browser,fixture.b.sessionToken);const page=await context.newPage();
    try{const query=new URLSearchParams({noteId:note!.id,title:"محاولة عابرة للمنشآت",body:"يجب رفض هذا الربط"});await page.goto(`${baseUrl}/dashboard/reminders?${query.toString()}`,{waitUntil:"domcontentloaded"});await configureInAppReminder(page);await page.getByRole("button",{name:"حفظ وتفعيل التذكير"}).click();await expect(page).toHaveURL(/create=note-invalid/);expect(await linkedReminderCount(fixture.b.businessId,note!.id)).toBe(0);}finally{await context.close()}
  });
  test("complete platform histories stay searchable, paginated and private beyond former caps",async({browser})=>{
    test.setTimeout(240_000);
    const own=await seedWorkspace("history"),foreign=await seedWorkspace("foreign-history");
    const prefix=`history-${own.businessId}`, reminderId=`${prefix}-notification-reminder`;
    const plan=await db.businessPlan.findUniqueOrThrow({where:{code:"FREE"}});
    await pool.query(`INSERT INTO "BusinessNote" ("id","businessId","title","body","updatedAt")
      SELECT $1||'-note-'||i,$2,'مذكرة سجل '||i,'محتوى المذكرة','2025-01-01'::timestamp+ i*interval '1 second' FROM generate_series(1,251) i`,[prefix,own.businessId]);
    await pool.query(`INSERT INTO "BusinessNote" ("id","businessId","title","body","priority","noteType","tags","updatedAt") VALUES
      ($1,$2,'مراجعة عقد قديم %_','تفاصيل قديمة قابلة للبحث','urgent','decision',ARRAY['مرجع-قديم'],'2024-01-01'),
      ($3,$4,'بيانات منشأة أخرى %_','تفاصيل خاصة','urgent','decision',ARRAY['مرجع-قديم'],'2024-01-01')`,[`${prefix}-old-note`,own.businessId,`${prefix}-foreign-note`,foreign.businessId]);
    await pool.query(`INSERT INTO "SmartReminder" ("id","businessId","createdByUserId","title","body","timezone","scheduledAt","status","progressPercent","workCompletedAt","completedAt","deliveryChannels","updatedAt")
      SELECT $1||'-completed-'||i,$2,$3,'تذكير مكتمل '||i,'عمل مكتمل','Asia/Riyadh','2024-01-01','completed',100,'2024-01-01','2024-01-01',ARRAY['in_app'],NOW() FROM generate_series(1,201) i`,[prefix,own.businessId,own.userId]);
    await pool.query(`INSERT INTO "SmartReminder" ("id","businessId","createdByUserId","title","body","timezone","scheduledAt","nextOccurrenceAt","status","deliveryChannels","updatedAt")
      SELECT $1||'-future-'||i,$2,$3,'متابعة قادمة '||i,CASE WHEN i=22 THEN 'مرجع نادر %_' ELSE 'تفاصيل العمل' END,'Asia/Riyadh','2050-01-01','2050-01-01','scheduled',ARRAY['in_app'],NOW() FROM generate_series(1,22) i`,[prefix,own.businessId,own.userId]);
    for(const [id,workspace,title] of [[reminderId,own,"متابعة تحتاج انتباه"],[`${prefix}-foreign-reminder`,foreign,"بيانات منشأة أخرى %_"]] as const){
      await pool.query(`INSERT INTO "SmartReminder" ("id","businessId","createdByUserId","title","body","timezone","scheduledAt","status","workHealth","businessDueAt","deliveryChannels","updatedAt") VALUES ($1,$2,$3,$4,'مرجع نادر %_','Asia/Riyadh',NOW(),'paused','blocked','2024-01-01',ARRAY['in_app'],NOW())`,[id,workspace.businessId,workspace.userId,title]);
    }
    await pool.query(`INSERT INTO "SmartReminderDelivery" ("id","businessId","reminderId","occurrenceAt","idempotencyKey","status","channel","updatedAt")
      SELECT $1||'-delivery-'||i,$2,$3,'2024-01-01'::timestamp+i*interval '1 day',$1||'-delivery-'||i,'sent','in_app',NOW() FROM generate_series(1,123) i`,[prefix,own.businessId,reminderId]);
    await pool.query(`INSERT INTO "SmartReminderNotification" ("id","businessId","userId","reminderId","deliveryId","title","body","occurredAt","readAt","createdAt")
      SELECT $1||'-notification-'||i,$2,CASE WHEN i=123 THEN $4 ELSE $3 END,$5,$1||'-delivery-'||i,'إشعار متابعة '||i,CASE WHEN i=1 THEN 'إشعار قديم %_' ELSE 'تفاصيل الإشعار' END,'2024-01-01'::timestamp+i*interval '1 day',CASE WHEN i BETWEEN 2 AND 102 THEN NOW() ELSE NULL END,'2024-01-01'::timestamp+i*interval '1 day' FROM generate_series(1,123) i`,[prefix,own.businessId,own.userId,foreign.userId,reminderId]);
    const ownSubscription=await db.subscription.create({data:{businessId:own.businessId,planId:plan.id,status:"canceled",provider:"moyasar",startsAt:new Date("2024-01-01"),endsAt:new Date("2024-02-01")}});
    const foreignSubscription=await db.subscription.create({data:{businessId:foreign.businessId,planId:plan.id,status:"canceled",provider:"moyasar",startsAt:new Date("2024-01-01"),endsAt:new Date("2024-02-01")}});
    const receipt={receiptSellerLegalName:"INFRO Test",receiptSellerAddress:"Test fixture address",receiptTaxStatus:"not_registered",receiptNetAmount:19900,receiptVatAmount:0,receiptIssuedAt:new Date("2024-01-01"),paidAt:new Date("2024-01-01")};
    await db.billingPayment.createMany({data:Array.from({length:26},(_,i)=>({id:`${prefix}-payment-${i===0?"old-%_":i}`,...receipt,subscriptionId:ownSubscription.id,providerPaymentId:`${prefix}-paid-${i}`,providerGivenId:`${prefix}-provider-${i}`,businessId:own.businessId,planId:plan.id,provider:"moyasar",kind:i===0?"renewal":"initial",amount:19900,status:"paid",paidAt:new Date("2024-01-01"),createdAt:new Date(Date.UTC(2024,0,1+i))}))});
    await db.billingPayment.create({data:{id:`${prefix}-foreign-payment-%_`,...receipt,subscriptionId:foreignSubscription.id,providerPaymentId:`${prefix}-foreign-paid`,providerGivenId:`${prefix}-foreign-provider`,businessId:foreign.businessId,planId:plan.id,provider:"moyasar",kind:"renewal",amount:19900,status:"paid"}});
    const context=await authenticatedContext(browser,own.sessionToken),page=await context.newPage();
    const pager=page.getByRole("navigation",{name:"صفحات السجل"});
    try{
      await page.goto(`${baseUrl}/dashboard/notes`);
      await expect(pager).toContainText("1–20 من 252 نتيجة");
      await pager.getByRole("link",{name:"التالي",exact:true}).click();
      await expect(pager).toContainText("21–40 من 252 نتيجة");
      await expect(page.getByText("تعذر تنفيذ العملية. لم نغيّر أي مذكرة غير مؤكدة.")).toHaveCount(0);
      await page.getByLabel("البحث في المذكرات",{exact:true}).fill("%_");
      await page.getByLabel("تصفية أولوية المذكرة").selectOption("urgent");
      await page.locator("#history").getByRole("button",{name:"تطبيق",exact:true}).click();
      await expect(pager).toContainText("1–1 من 1 نتيجة");
      await expect(page.getByRole("heading",{name:"مراجعة عقد قديم %_",exact:true})).toBeVisible();
      await page.goto(`${baseUrl}/dashboard/notes?q=${encodeURIComponent("' OR 1=1 --")}`);
      await expect(pager).toContainText("لا توجد نتائج مطابقة");
      await page.goto(`${baseUrl}/dashboard/reminders?tab=upcoming`);
      await expect(pager).toContainText("1–20 من 22 نتيجة");
      await expect(page.getByRole("navigation",{name:"حالات التذكيرات"})).toContainText("منجزة201");
      await pager.getByRole("link",{name:"التالي",exact:true}).click();
      await expect(pager).toContainText("21–22 من 22 نتيجة");
      await page.getByLabel("البحث في التذكيرات",{exact:true}).fill("%_");
      await page.locator("#history").getByRole("button",{name:"بحث",exact:true}).click();
      await expect(pager).toContainText("1–1 من 1 نتيجة");
      await expect(page.getByRole("heading",{name:"متابعة قادمة 22",exact:true})).toBeVisible();
      await page.getByRole("navigation",{name:"حالات التذكيرات"}).getByRole("link",{name:/تحتاج انتباه/}).click();
      await expect(pager).toContainText("1–1 من 1 نتيجة");
      await expect(page.getByLabel("البحث في التذكيرات",{exact:true})).toHaveValue("%_");
      await expect(page.getByRole("heading",{name:"متابعة تحتاج انتباه",exact:true})).toBeVisible();
      await page.goto(`${baseUrl}/dashboard/reminders?tab=today`);
      await expect(page.getByRole("heading",{name:"متابعة تحتاج انتباه",exact:true})).toBeVisible();
      await page.goto(`${baseUrl}/dashboard/notifications?tab=unread&page=999999`);
      await expect(pager).toContainText("21–21 من 21 نتيجة");
      await expect(page.getByRole("heading",{name:"إشعار متابعة 1",exact:true})).toBeVisible();
      await page.getByLabel("البحث في الإشعارات",{exact:true}).fill("%_");
      await page.locator("#history").getByRole("button",{name:"بحث",exact:true}).click();
      await expect(pager).toContainText("1–1 من 1 نتيجة");
      await page.getByRole("button",{name:"تحديد كمقروء",exact:true}).click();
      await expect(page).toHaveURL(/read=success/);
      await expect(page.getByLabel("البحث في الإشعارات",{exact:true})).toHaveValue("%_");
      await expect(pager).toContainText("لا توجد نتائج مطابقة");
      await page.getByRole("navigation",{name:"تصفية الإشعارات"}).getByRole("link",{name:"المقروءة",exact:true}).click();
      await expect(pager).toContainText("1–1 من 1 نتيجة");
      await page.goto(`${baseUrl}/dashboard/notifications?tab=unread&q=${encodeURIComponent("إشعار متابعة")}`);
      await page.getByRole("button",{name:"تحديد الكل كمقروء",exact:true}).click();
      await expect(page).toHaveURL(/readAll=success/);
      await expect(pager).toContainText("لا توجد نتائج مطابقة");
      const foreignUnread=await pool.query('SELECT "readAt" FROM "SmartReminderNotification" WHERE "id"=$1',[`${prefix}-notification-123`]);
      expect(foreignUnread.rows[0].readAt).toBeNull();
      await page.goto(`${baseUrl}/dashboard/billing/manage`);
      await expect(pager).toContainText("1–20 من 26 نتيجة");
      await expect(page.locator("header").filter({hasText:"INFRO BILLING CENTER"})).toContainText("26");
      await pager.getByRole("link",{name:"التالي",exact:true}).click();
      await expect(pager).toContainText("21–26 من 26 نتيجة");
      await page.getByLabel("البحث في المدفوعات",{exact:true}).fill("%_");
      await page.getByLabel("تصفية نوع العملية").selectOption("renewal");
      await page.locator("#history").getByRole("button",{name:"تطبيق",exact:true}).click();
      await expect(pager).toContainText("1–1 من 1 نتيجة");
      await expect(page.locator("#history").getByRole("link",{name:"عرض الإيصال"})).toHaveAttribute("href",`/dashboard/billing/receipt/${prefix}-payment-old-%_`);
      const {mkdir}=await import("node:fs/promises");
      const outDir=process.env.INFRO_VISUAL_AUDIT_DIR||"/tmp/infro-visual-audit";await mkdir(outDir,{recursive:true});
      for(const viewport of [{width:1440,height:960},{width:390,height:844}])for(const theme of ["light","dark"]){
        await page.setViewportSize(viewport);
        await page.evaluate(theme=>localStorage.setItem("infro-dashboard-theme",theme),theme);
        for(const route of ["notes?q=%25_","reminders?tab=attention","notifications?tab=read&q=%25_","billing/manage?kind=renewal"]){
          await page.goto(`${baseUrl}/dashboard/${route}#history`);
          await expect(page.locator("#history")).toBeVisible();
          await expect(page.locator("[data-dashboard-path]")).toHaveAttribute("data-dashboard-theme",theme);
          await expect(pager).toContainText("1–1 من 1 نتيجة");
          expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
          await page.screenshot({path:`${outDir}/${viewport.width<1024?"mobile":"desktop"}-${theme}-${route.split("?")[0].replace("/","-")}-platform-workspace.png`});
        }
      }
    }finally{await context.close();}
  });

});
