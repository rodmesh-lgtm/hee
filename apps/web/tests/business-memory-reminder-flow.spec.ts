import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

type Workspace = { userId:string; businessId:string; sessionToken:string };
type Fixture = { a:Workspace; b:Workspace };
type NoteRow = { id:string; title:string };
type ReminderRow = { id:string; businessId:string; businessNoteId:string|null; status:string; deliveryChannels:string[] };
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

async function noteByTitle(businessId:string,title:string){
  const result=await pool.query<NoteRow>('SELECT "id","title" FROM "BusinessNote" WHERE "businessId"=$1 AND "title"=$2 LIMIT 1',[businessId,title]);
  return result.rows[0]??null;
}
async function linkedReminder(businessId:string,noteId:string){
  const result=await pool.query<ReminderRow>('SELECT "id","businessId","businessNoteId","status","deliveryChannels" FROM "SmartReminder" WHERE "businessId"=$1 AND "businessNoteId"=$2 LIMIT 1',[businessId,noteId]);
  return result.rows[0]??null;
}
async function noteCount(businessId:string,noteId:string){
  const result=await pool.query<{count:string}>('SELECT COUNT(*)::text AS "count" FROM "BusinessNote" WHERE "businessId"=$1 AND "id"=$2',[businessId,noteId]);
  return Number(result.rows[0]?.count??0);
}
async function linkedReminderCount(businessId:string,noteId:string){
  const result=await pool.query<{count:string}>('SELECT COUNT(*)::text AS "count" FROM "SmartReminder" WHERE "businessId"=$1 AND "businessNoteId"=$2',[businessId,noteId]);
  return Number(result.rows[0]?.count??0);
}

async function authenticatedContext(browser:Browser,token:string):Promise<BrowserContext>{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addCookies([{name:"hee_session",value:token,url:baseUrl}]);
  return context;
}

async function configureInAppReminder(page:import("@playwright/test").Page){
  await page.getByRole("button",{name:"بعد ساعة"}).click();
  const whatsapp=page.locator('input[name="deliveryChannels"][value="whatsapp"]');
  if(await whatsapp.isChecked().catch(()=>false))await whatsapp.uncheck();
  await page.locator('input[name="deliveryChannels"][value="in_app"]').check();
}

test.describe.serial("Business Memory → Smart Reminder execution chain",()=>{
  test.beforeAll(async()=>{
    const connectionString=String(process.env.DATABASE_URL??"").trim();
    if(!connectionString)throw new Error("DATABASE_URL is required");
    pool=new Pool({connectionString,max:4});
    db=new PrismaClient({adapter:new PrismaPg(pool)});
    fixture={a:await seedWorkspace("A"),b:await seedWorkspace("B")};
  });

  test.afterAll(async()=>{
    // The workflow database is disposable. Do not mutate append-only audit history merely to
    // clean test fixtures; the entire PostgreSQL service is destroyed at the end of the job.
    await db?.$disconnect();
    await pool?.end();
  });

  test("creates a reviewed linked reminder, preserves note provenance, and blocks unsafe hard delete",async({browser})=>{
    if(!fixture)throw new Error("fixture missing");
    const context=await authenticatedContext(browser,fixture.a.sessionToken);
    const page=await context.newPage();
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

      const note=await noteByTitle(fixture.a.businessId,"متابعة عرض عميل الاختبار");
      expect(note).not.toBeNull();
      const reminder=await linkedReminder(fixture.a.businessId,note!.id);
      expect(reminder).not.toBeNull();
      expect(reminder!.businessId).toBe(fixture.a.businessId);
      expect(reminder!.businessNoteId).toBe(note!.id);
      expect(reminder!.status).toBe("scheduled");
      expect(reminder!.deliveryChannels).toContain("in_app");

      await page.goto(`${baseUrl}/dashboard/notes`,{waitUntil:"domcontentloaded"});
      const noteCard=page.locator("article").filter({hasText:"متابعة عرض عميل الاختبار"});
      await noteCard.locator("summary").click();
      await noteCard.getByRole("button",{name:"حذف نهائي"}).click();
      await expect(page).toHaveURL(/delete=linked-reminder/);
      await expect(page.getByText("لا يمكن حذف هذه المذكرة نهائيًا لأنها مرتبطة بتذكير.",{exact:false})).toBeVisible();
      expect(await noteCount(fixture.a.businessId,note!.id)).toBe(1);
    }finally{await context.close()}
  });

  test("rejects a cross-tenant note id when another business attempts to create a linked reminder",async({browser})=>{
    if(!fixture)throw new Error("fixture missing");
    const note=await noteByTitle(fixture.a.businessId,"متابعة عرض عميل الاختبار");
    expect(note).not.toBeNull();
    const context=await authenticatedContext(browser,fixture.b.sessionToken);
    const page=await context.newPage();
    try{
      const query=new URLSearchParams({noteId:note!.id,title:"محاولة عابرة للمنشآت",body:"يجب رفض هذا الربط"});
      await page.goto(`${baseUrl}/dashboard/reminders?${query.toString()}`,{waitUntil:"domcontentloaded"});
      await configureInAppReminder(page);
      await page.getByRole("button",{name:"حفظ وتفعيل التذكير"}).click();
      await expect(page).toHaveURL(/create=note-invalid/);
      expect(await linkedReminderCount(fixture.b.businessId,note!.id)).toBe(0);
    }finally{await context.close()}
  });
});
