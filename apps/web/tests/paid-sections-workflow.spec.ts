import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
const baseUrl=process.env.PLAYWRIGHT_BASE_URL||"http://127.0.0.1:3000";
test("paid workspace gates reject free, expired and revoked grants while analytics remains open",async({browser})=>{
 test.setTimeout(180_000);
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:3}),db=new PrismaClient({adapter:new PrismaPg(pool)});
 const suffix=randomUUID();
 const free=await db.businessPlan.upsert({where:{code:"FREE"},update:{},create:{code:"FREE",name:"Free",monthlyPrice:0,productLimit:3}});
 const paid=await db.businessPlan.upsert({where:{code:"BUSINESS"},update:{},create:{code:"BUSINESS",name:"Business",monthlyPrice:99,productLimit:10}});
 const user=await db.user.create({data:{name:"اختبار قفل الأقسام",email:`paid-gate-${suffix}@hee.test`,emailVerifiedAt:new Date()}});
 const business=await db.business.create({data:{ownerId:user.id,planId:free.id,name:"منشأة تجربة مجانية",slug:`paid-gate-${suffix}`,businessType:"خدمات",onboardingCompleted:true}});
 const token=randomUUID();await db.session.create({data:{userId:user.id,token,expiresAt:new Date(Date.now()+3600_000)}});
 const context=await browser.newContext({viewport:{width:1366,height:900}});await context.addCookies([{name:"hee_session",value:token,url:baseUrl}]);const page=await context.newPage();
 const paths=[['business-store','store'],['staff','staff'],['notes','notes'],['reminders','reminders'],['appointments','appointments'],['working-hours','appointments'],['inbox','orders'],['live-view','liveView'],['live-view/setup','liveView']];
 try{
  for(const [path,feature] of paths){await page.goto(`${baseUrl}/dashboard/${path}`);await expect(page).toHaveURL(new RegExp(`/dashboard/billing/manage\\?feature=${feature}$`));}
  await page.goto(`${baseUrl}/Accounting`);await expect(page).toHaveURL(/feature=accounting/);
  await page.goto(`${baseUrl}/dashboard/retail-analytics`);await expect(page).toHaveURL(/\/dashboard\/retail-analytics$/);
  await expect(page.locator('a[href="/dashboard/billing/manage?feature=notes"]').first()).toBeVisible();
  const dir=process.env.INFRO_VISUAL_AUDIT_DIR||'/tmp/infro-visual-audit';await mkdir(dir,{recursive:true});await page.screenshot({path:`${dir}/paid-sections-free.png`,fullPage:false});
  expect((await context.request.get(`${baseUrl}/api/dashboard/bookings/updates?businessId=${business.id}`)).status()).toBe(403);
  const noteResponse=await context.request.post(`${baseUrl}/api/business-notes/organize`,{headers:{Origin:baseUrl},data:{memo:"اختبار منع القراءة"}});expect(noteResponse.status()).toBe(403);expect((await noteResponse.json()).code).toBe('business_required');
  const subscription=await db.subscription.create({data:{businessId:business.id,planId:paid.id,provider:"internal",startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+86400_000)}});
  for(const path of ['notes','staff','inbox','appointments','business-store']){await page.goto(`${baseUrl}/dashboard/${path}`);await expect(page).toHaveURL(`${baseUrl}/dashboard/${path}`);}
  expect((await context.request.get(`${baseUrl}/api/dashboard/bookings/updates?businessId=${business.id}`)).status()).toBe(200);
  await db.subscription.update({where:{id:subscription.id},data:{endsAt:new Date(Date.now()-1000)}});
  await page.goto(`${baseUrl}/dashboard/notes`);await expect(page).toHaveURL(/feature=notes/);
  await db.subscription.update({where:{id:subscription.id},data:{status:"replaced"}});
  const code=await db.subscriptionAccessCode.create({data:{codeHash:randomUUID(),planId:paid.id,createdByUserId:user.id}});
  const grantTerm=await db.subscription.create({data:{businessId:business.id,planId:paid.id,provider:"access_code",autoRenew:false,startsAt:new Date(Date.now()-60000),endsAt:null}});
  await db.subscriptionAccessGrant.create({data:{codeId:code.id,businessId:business.id,planId:paid.id,subscriptionId:grantTerm.id,redeemedByUserId:user.id}});
  await page.goto(`${baseUrl}/dashboard/notes`);await expect(page).toHaveURL(`${baseUrl}/dashboard/notes`);
  await db.subscriptionAccessCode.update({where:{id:code.id},data:{revokedAt:new Date(),isActive:false}});
  await page.reload();await expect(page).toHaveURL(/feature=notes/);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${dir}/paid-sections-mobile.png`,fullPage:true});
  await page.goto(`${baseUrl}/dashboard/retail-analytics`);await expect(page).toHaveURL(/\/dashboard\/retail-analytics$/);
 }finally{await context.close();await db.subscriptionAccessGrant.deleteMany({where:{businessId:business.id}});await db.subscriptionAccessCode.deleteMany({where:{createdByUserId:user.id}});await db.subscription.deleteMany({where:{businessId:business.id}});await db.business.delete({where:{id:business.id}});await db.session.deleteMany({where:{userId:user.id}});await db.user.delete({where:{id:user.id}});await db.$disconnect();await pool.end();}
});
