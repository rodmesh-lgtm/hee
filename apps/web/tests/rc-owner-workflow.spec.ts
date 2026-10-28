import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const png1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5X0i8AAAAASUVORK5CYII=",
  "base64",
);

type Seeded = { userId:string; businessId:string; sessionToken:string; slug:string };
let pool:Pool; let db:PrismaClient; let seededForCleanup:Seeded|null=null;

async function seedBusiness():Promise<Seeded>{
  const suffix=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const plan=await db.businessPlan.upsert({where:{code:"FREE"},update:{isActive:true},create:{code:"FREE",name:"Free",monthlyPrice:0,productLimit:3,isActive:true}});
  const user=await db.user.create({data:{name:"RC Owner",email:`rc-owner-${suffix}@hee.test`,passwordHash:"rc-only",emailVerifiedAt:new Date()}});
  const slug=`rc-owner-${suffix}`;
  const business=await db.business.create({data:{ownerId:user.id,planId:plan.id,name:"منشأة اختبار HEE",slug,businessType:"خدمات أعمال",shortDescription:"هوية أعمال رقمية للاختبار قبل الإطلاق",description:"بيانات اختبار للتحقق من الحفظ والنشر واستمرارية بيانات العميل.",phone:"0555000011",whatsapp:"966555000011",city:"الرياض",district:"العليا",isPublished:false,onboardingCompleted:true}});
  await db.service.createMany({data:[{businessId:business.id,name:"استشارة أعمال",description:"خدمة أولى",price:100,sortOrder:0},{businessId:business.id,name:"تطوير الهوية",description:"خدمة ثانية",price:200,sortOrder:1}]});
  const branch=await db.branch.create({data:{businessId:business.id,name:"الفرع الرئيسي",city:"الرياض",district:"العليا",isMain:true,sortOrder:0}});
  await db.contactPerson.create({data:{businessId:business.id,branchId:branch.id,name:"مسؤول التواصل",jobTitle:"خدمة العملاء",whatsapp:"966555000011",isPrimary:true}});
  const sessionToken=crypto.randomUUID(); await db.session.create({data:{token:sessionToken,userId:user.id,expiresAt:new Date(Date.now()+60*60*1000)}});
  return{userId:user.id,businessId:business.id,sessionToken,slug};
}
async function setSessionCookie(page:Page,token:string){await page.context().addCookies([{name:"hee_session",value:token,url:baseUrl}]);}
async function waitForBusiness(fields:{id:string;name?:string;isPublished?:boolean}){await expect.poll(async()=>{const business=await db.business.findUnique({where:{id:fields.id},select:{name:true,isPublished:true}});if(!business)return"missing";if(fields.name&&business.name!==fields.name)return`name:${business.name}`;if(typeof fields.isPublished==="boolean"&&business.isPublished!==fields.isPublished)return`published:${business.isPublished}`;return"ok";},{timeout:20_000}).toBe("ok");}
async function assertResponsive(browser:Browser,seeded:Seeded){for(const viewport of[{width:390,height:844},{width:1280,height:900}]){const page=await browser.newPage({viewport});await page.goto(`${baseUrl}/${seeded.slug}`,{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{name:"منشأة HEE المحدثة"})).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);expect(overflow).toBeLessThanOrEqual(2);await expect(page.locator("header").getByText("خدمات أعمال",{exact:true})).toHaveCount(0);await page.evaluate(()=>window.scrollTo(0,600));await expect.poll(async()=>{const box=await page.locator("[data-infro-customer-header]").boundingBox();return box?.y??-1;}).toBeGreaterThanOrEqual(0);const mark=await page.locator("[data-infro-customer-header]").boundingBox();expect(mark!.y).toBeLessThan(80);await page.close();}}
async function cleanup(seeded:Seeded){const business=await db.business.findUnique({where:{id:seeded.businessId},select:{logoUrl:true,coverUrl:true}});const storageIds=[business?.logoUrl,business?.coverUrl].map(value=>String(value??"").split("/api/storage/")[1]||"").filter(Boolean);await db.analyticsEvent.deleteMany({where:{businessId:seeded.businessId}});await db.contactPerson.deleteMany({where:{businessId:seeded.businessId}});await db.department.deleteMany({where:{businessId:seeded.businessId}});await db.branch.deleteMany({where:{businessId:seeded.businessId}});await db.socialLink.deleteMany({where:{businessId:seeded.businessId}});await db.workingHours.deleteMany({where:{businessId:seeded.businessId}});await db.galleryItem.deleteMany({where:{businessId:seeded.businessId}});await db.offer.deleteMany({where:{businessId:seeded.businessId}});await db.booking.deleteMany({where:{businessId:seeded.businessId}});await db.orderItem.deleteMany({where:{order:{businessId:seeded.businessId}}});await db.order.deleteMany({where:{businessId:seeded.businessId}});await db.customer.deleteMany({where:{businessId:seeded.businessId}});await db.product.deleteMany({where:{businessId:seeded.businessId}});await db.category.deleteMany({where:{businessId:seeded.businessId}});await db.service.deleteMany({where:{businessId:seeded.businessId}});await db.subscription.deleteMany({where:{businessId:seeded.businessId}});await db.business.delete({where:{id:seeded.businessId}});if(storageIds.length)await db.storedObject.deleteMany({where:{id:{in:storageIds}}});await db.session.deleteMany({where:{userId:seeded.userId}});await db.authIdentity.deleteMany({where:{userId:seeded.userId}});await db.user.delete({where:{id:seeded.userId}});}

test.describe.serial("RC owner workflow",()=>{
  test.beforeAll(async()=>{const connectionString=String(process.env.DATABASE_URL??"").trim();if(!connectionString)throw new Error("DATABASE_URL is required for RC workflow");pool=new Pool({connectionString,max:4});db=new PrismaClient({adapter:new PrismaPg(pool)});});
  test.afterAll(async()=>{await db?.$disconnect();await pool?.end();});
  test.afterEach(async()=>{if(!seededForCleanup)return;const seeded=seededForCleanup;seededForCleanup=null;await cleanup(seeded);});
  test("covers current editor, branding, publish, public V10, responsive rendering and data retention",async({browser})=>{
    test.setTimeout(210_000);const seeded=await seedBusiness();seededForCleanup=seeded;const page=await browser.newPage({viewport:{width:1280,height:900}});await setSessionCookie(page,seeded.sessionToken);
    try{
      await page.goto(`${baseUrl}/dashboard/my-page`,{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{name:"صفحتي"})).toBeVisible();await expect(page.getByLabel("اسم المنشأة")).toHaveValue("منشأة اختبار HEE");
      await page.getByLabel("اسم المنشأة").fill("منشأة HEE المحدثة");await page.getByLabel("الوصف المختصر").fill("تم تحديث هذه البيانات عبر المحرر الحالي وحفظها تلقائيًا");await page.getByLabel("الحي").fill("الملقا");await waitForBusiness({id:seeded.businessId,name:"منشأة HEE المحدثة"});await expect(page.getByText("محفوظ تلقائيًا",{exact:true})).toBeVisible({timeout:20_000});
      const persisted=await db.business.findUnique({where:{id:seeded.businessId},select:{shortDescription:true,district:true}});expect(persisted?.shortDescription).toContain("المحرر الحالي");expect(persisted?.district).toBe("الملقا");
      await page.goto(`${baseUrl}/dashboard/branding`,{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{name:"المظهر والهوية",exact:true})).toBeVisible();await page.locator('input[name="logoFile"]').setInputFiles({name:"rc-logo.png",mimeType:"image/png",buffer:png1x1});await page.locator('input[name="coverFile"]').setInputFiles({name:"rc-cover.png",mimeType:"image/png",buffer:png1x1});await page.getByRole("button",{name:"حفظ الصور"}).click();await expect(page.getByText("تم تحديث صور الهوية.")).toBeVisible({timeout:20_000});await expect.poll(async()=>{const row=await db.business.findUnique({where:{id:seeded.businessId},select:{logoUrl:true,coverUrl:true}});return Boolean(row?.logoUrl?.startsWith("/api/storage/")&&row.coverUrl?.startsWith("/api/storage/"));},{timeout:20_000}).toBe(true);
      await page.goto(`${baseUrl}/dashboard/branding`,{waitUntil:"networkidle"});
      const modulesBefore=JSON.stringify((await db.business.findUniqueOrThrow({where:{id:seeded.businessId}})).pageModules);
      const themePreview=page.locator('[data-identity-theme-preview]');
      await expect(themePreview.getByRole('img',{name:'شعار منشأة HEE المحدثة في المعاينة'})).toBeVisible();
      await expect(themePreview).toContainText('تم تحديث هذه البيانات عبر المحرر الحالي');
      await page.getByRole('button',{name:'معاينة ضيقة',exact:true}).click();
      await expect(themePreview).toHaveAttribute('data-preview-size','mobile');
      await expect(themePreview).toHaveCSS('max-width','320px');
      await page.getByRole('button',{name:'معاينة واسعة',exact:true}).click();
      await expect(themePreview).toHaveAttribute('data-preview-size','wide');
      await page.getByRole('button',{name:'عنابي',exact:true}).click();
      await page.getByRole('button',{name:'إلغاء التغييرات',exact:true}).click();
      await expect(page.getByLabel('اللون الرئيسي والأزرار',{exact:true})).toHaveValue('#204f43');
      await expect(page.getByRole('button',{name:'حفظ مظهر الصفحة',exact:true})).toBeDisabled();
      await page.getByRole("button",{name:"كحلي",exact:true}).click();
      await page.getByLabel("خط الصفحة",{exact:true}).selectOption("cairo");
      await page.getByRole("button",{name:"حفظ مظهر الصفحة",exact:true}).click();
      await expect(page.getByRole("status")).toContainText("تم حفظ مظهر الصفحة");
      await page.reload({waitUntil:"networkidle"});
      await expect(page.getByLabel("اللون الرئيسي والأزرار",{exact:true})).toHaveValue("#243b64");
      await expect(page.getByLabel("خط الصفحة",{exact:true})).toHaveValue("cairo");
      const stored=await db.business.findUniqueOrThrow({where:{id:seeded.businessId}});
      const savedModules=stored.pageModules as Array<{id:string;config:{appearance?:{primary:string;font:string}}}>;
      expect(savedModules.find(module=>module.id==="contact")?.config.appearance).toMatchObject({primary:"#243b64",font:"cairo"});
      if(modulesBefore!=="null") expect(savedModules.map(module=>({...module,config:{...module.config,appearance:undefined}}))).toEqual(JSON.parse(modulesBefore));
      const invalidTheme=await page.request.post(`${baseUrl}/api/dashboard/page-appearance`,{headers:{Origin:baseUrl},data:{businessId:seeded.businessId,appearance:{primary:"url(https://invalid.test)",accent:"#ffffff",background:"#ffffff",font:"cairo"}}});
      expect(invalidTheme.status()).toBe(400);
      const crossTenant=await page.request.post(`${baseUrl}/api/dashboard/page-appearance`,{headers:{Origin:baseUrl},data:{businessId:"another-business",appearance:{primary:"#243b64",accent:"#b6a175",background:"#f7f9fc",font:"cairo"}}});
      expect(crossTenant.status()).toBe(409);
      const foreignOrigin=await page.request.post(`${baseUrl}/api/dashboard/page-appearance`,{headers:{Origin:"https://untrusted.example"},data:{businessId:seeded.businessId,appearance:{primary:"#243b64",accent:"#b6a175",background:"#f7f9fc",font:"cairo"}}});
      expect(foreignOrigin.status()).toBe(403);
      await page.goto(`${baseUrl}/dashboard/my-page`,{waitUntil:"domcontentloaded"});await Promise.all([page.waitForEvent("framenavigated",frame=>frame===page.mainFrame()&&frame.url().includes("/dashboard/my-page")),page.getByRole("button",{name:"نشر الصفحة"}).click()]);await waitForBusiness({id:seeded.businessId,isPublished:true});await expect(page.locator("#dashboard-main-content").getByText("منشورة",{exact:true})).toBeVisible({timeout:20_000});
      // Publishing is a server action followed by a router refresh. Wait for that refresh to settle
      // before leaving the editor so it cannot race the explicit public-page navigation below.
      await page.waitForLoadState("networkidle");
      await page.goto(`${baseUrl}/${seeded.slug}`,{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{name:"منشأة HEE المحدثة"})).toBeVisible();await expect(page.locator('section[aria-labelledby="intent-title"]')).toBeVisible();await expect(page.getByRole("heading",{name:"أبرز ما نقدمه"})).toBeVisible();await expect(page.getByText("استشارة أعمال",{exact:true})).toBeVisible();await expect(page.getByText("تطوير الهوية",{exact:true})).toBeVisible();await expect(page.getByRole("heading",{name:"فروعنا"})).toBeVisible();
      await expect(page.locator("[data-public-page]")).toHaveCSS("--primary","#243b64");
      await expect(page.locator("[data-public-page]")).toHaveCSS("font-family",/cairo/i);
      await expect(page.locator("[data-infro-customer-header]")).toBeVisible();
      await assertResponsive(browser,seeded);
      await page.goto(`${baseUrl}/dashboard/branding`,{waitUntil:"networkidle"});
      await page.getByRole("button",{name:"استعادة مظهر انفرو",exact:true}).click();
      await page.getByRole("button",{name:"حفظ مظهر الصفحة",exact:true}).click();
      await expect(page.getByRole("status")).toContainText("تم حفظ مظهر الصفحة");
      await page.goto(`${baseUrl}/${seeded.slug}`,{waitUntil:"networkidle"});
      await expect(page.locator("[data-public-page]")).toHaveCSS("--primary","#204f43");
      await page.goto(`${baseUrl}/dashboard/my-page`,{waitUntil:"domcontentloaded"});page.once("dialog",async dialog=>{expect(dialog.type()).toBe("confirm");expect(dialog.message()).toContain("إلغاء نشر الصفحة");await dialog.accept();});await page.getByRole("button",{name:"إلغاء النشر"}).click();await waitForBusiness({id:seeded.businessId,isPublished:false});const retained=await db.business.findUnique({where:{id:seeded.businessId},include:{services:true,branches:true,contactPersons:true}});expect(retained?.name).toBe("منشأة HEE المحدثة");expect(retained?.services).toHaveLength(2);expect(retained?.branches).toHaveLength(1);expect(retained?.contactPersons).toHaveLength(1);expect(retained?.logoUrl).toMatch(/^\/api\/storage\//);expect(retained?.coverUrl).toMatch(/^\/api\/storage\//);
    }finally{await page.close();}
  });
  test("public identity expands every published service, branch and gallery item",async({page})=>{
    const seeded=await seedBusiness();seededForCleanup=seeded;
    await db.service.createMany({data:Array.from({length:5},(_,index)=>({businessId:seeded.businessId,name:`خدمة إضافية ${index+1}`,price:100,sortOrder:index+2}))});
    await db.branch.createMany({data:Array.from({length:6},(_,index)=>({businessId:seeded.businessId,name:`فرع إضافي ${index+1}`,city:'الرياض',sortOrder:index+1}))});
    await db.galleryItem.createMany({data:Array.from({length:7},(_,index)=>({businessId:seeded.businessId,imageUrl:'/favicon.ico',caption:`عمل تجريبي ${index+1}`,sortOrder:index}))});
    await db.business.update({where:{id:seeded.businessId},data:{isPublished:true}});
    await page.goto(`${baseUrl}/${seeded.slug}`,{waitUntil:'networkidle'});
    for(const [label,selector] of [['الخدمات','#services > article'],['الفروع','#branch-list > a'],['الأعمال','#gallery-list > a']] as const){
      await expect(page.locator(selector)).toHaveCount(6);
      const expand=page.getByRole('button',{name:`عرض الكل · ${label} (٧)`,exact:true});
      await expect(expand).toHaveAttribute('aria-expanded','false');
      await expand.click();
      await expect(page.locator(selector)).toHaveCount(7);
      const collapse=page.getByRole('button',{name:`عرض أقل · ${label}`,exact:true});
      await expect(collapse).toHaveAttribute('aria-expanded','true');
      await collapse.click();
      await expect(page.locator(selector)).toHaveCount(6);
    }
  });
  test("homepage answers launch questions and mobile navigation reaches the FAQ",async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(baseUrl,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'فتح القائمة',exact:true}).click();
    const menu=page.getByRole('dialog',{name:'قائمة التنقل'});
    await menu.getByRole('link',{name:'الأسئلة الشائعة',exact:true}).click();
    await expect(menu).not.toBeVisible();
    await expect(page).toHaveURL(/#faq$/);
    await expect(page.getByRole('heading',{name:'إجابات واضحة لخطوتك الأولى'})).toBeInViewport();
    await page.getByText('هل أستطيع تغيير ألوان الصفحة والخط؟',{exact:true}).click();
    await expect(page.locator('#faq')).toContainText('ثلاثة خطوط عربية');
    await expect(page.locator('#faq details[open]')).toContainText('يمكنك اختيار مجموعة ألوان');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
  });
});
