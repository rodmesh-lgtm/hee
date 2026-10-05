import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { getDefaultPageModules } from "../app/lib/page-modules";
import { retryCampaignFailureReceipt } from "../app/lib/whatsapp/campaign-receipt-retry";
import { persistSubmittedTemplate, submitTemplateRequest, recentSubmissionWhere } from "../app/lib/whatsapp/template-submission";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.INFRO_VISUAL_AUDIT_DIR || "/tmp/infro-visual-audit";

type Seeded = { userId:string; businessId:string; sessionToken:string; adminUserId:string; adminSessionToken:string };
let pool:Pool; let db:PrismaClient; let seeded:Seeded|null=null;

async function seedWorkspace():Promise<Seeded>{
  const suffix=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const plan=await db.businessPlan.upsert({where:{code:"FREE"},update:{isActive:true},create:{code:"FREE",name:"Free",monthlyPrice:0,productLimit:3,isActive:true}});
  const user=await db.user.create({data:{name:"INFRO Visual QA",email:`infro-visual-${suffix}@hee.test`,passwordHash:"visual-only",emailVerifiedAt:new Date()}});
  const business=await db.business.create({data:{ownerId:user.id,planId:plan.id,name:"منشأة مراجعة INFRO",slug:`visual-audit-${suffix}`,businessType:"خدمات أعمال",shortDescription:"مساحة اختبار بصرية ووظيفية قبل الإطلاق",description:"بيانات مؤقتة لمراجعة واجهة INFRO.",phone:"0555000011",whatsapp:"966555000011",city:"الرياض",district:"العليا",isPublished:false,onboardingCompleted:true}});
  await db.service.create({data:{businessId:business.id,name:"استشارة أعمال",description:"خدمة اختبار",price:250,sortOrder:0}});
  await db.branch.create({data:{businessId:business.id,name:"الفرع الرئيسي",city:"الرياض",district:"العليا",isMain:true,sortOrder:0}});
  const noteIds=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
  const dueSoon=new Date(Date.now()+2*60*60*1000);
  await db.$executeRaw(Prisma.sql`INSERT INTO "BusinessNote"
    ("id","businessId","title","body","status","priority","workHealth","responsiblePerson","businessDueAt","nextAction") VALUES
    (${noteIds[0]},${business.id},${"متابعة عرض العميل قبل نهاية اليوم"},${"مذكرة اختبار مرئية طويلة بما يكفي لاختبار التفاف النص العربي داخل بطاقة التنفيذ."},'active','urgent','blocked',${"مسؤول خدمة العملاء"},${dueSoon},${"مراجعة الرد الأخير ثم إرسال النسخة النهائية من العرض للعميل"}),
    (${noteIds[1]},${business.id},${"اعتماد تفاصيل الخدمة وتحديث الملف التعريفي"},${"محتوى اختبار لتغطية البطاقة الثانية وحالات الأولوية والمسؤول والموعد."},'active','high','at_risk',${"فريق الهوية الرقمية"},${dueSoon},${"تأكيد البيانات الناقصة وتحديث صفحة الهوية"}),
    (${noteIds[2]},${business.id},${"إغلاق متابعة تشغيلية معلقة مع المورد"},${"محتوى اختبار لتغطية البطاقة الثالثة ومنع نجاح المراجعة في حالة عدم وجود أعمال."},'active','high','on_track',${"مدير العمليات"},${dueSoon},${"توثيق نتيجة المتابعة وإغلاق المهمة بعد التأكيد"})`);
  const sessionToken=crypto.randomUUID();
  await db.session.create({data:{token:sessionToken,userId:user.id,expiresAt:new Date(Date.now()+60*60*1000)}});
  const admin=await db.user.upsert({where:{email:"infro-visual-admin@hee.test"},update:{name:"INFRO Visual Admin",deletedAt:null,emailVerifiedAt:new Date()},create:{name:"INFRO Visual Admin",email:"infro-visual-admin@hee.test",passwordHash:"visual-only",emailVerifiedAt:new Date()}});
  const adminSessionToken=crypto.randomUUID();
  await db.session.create({data:{token:adminSessionToken,userId:admin.id,expiresAt:new Date(Date.now()+60*60*1000)}});
  const store=await db.whatsAppCommerceIntegration.create({data:{businessId:business.id,provider:"salla",externalStoreId:`visual-${suffix}`,displayName:"متجر اختبار متأخر",status:"active",connectedAt:new Date(Date.now()-86_400_000),lastWebhookAt:new Date(Date.now()-86_400_000),credentialEnvelope:{testSecret:"DO_NOT_RENDER_COMMERCE_SECRET"}}});
  await db.whatsAppCommerceIntegration.create({data:{businessId:business.id,provider:"woocommerce",externalStoreId:`https://visual-${suffix}.example.com`,status:"active",connectedAt:new Date(),credentialEnvelope:{testSecret:"DO_NOT_RENDER_COMMERCE_SECRET"},lastErrorCode:"https://unsafe.example/token=DO_NOT_RENDER_COMMERCE_SECRET"}});
  await db.sallaWebhookEvent.create({data:{businessId:business.id,integrationId:store.id,eventId:`visual-${suffix}`,eventType:"order.updated",merchantId:"123",payload:{testSecret:"DO_NOT_RENDER_COMMERCE_SECRET"},status:"failed",attemptCount:3,lastErrorCode:"SALLA_ORDER_SYNC_FAILED"}});
  await db.analyticsEvent.create({data:{businessId:business.id,eventType:"commerce_periodic_sync_result",metadata:{integrationId:store.id,provider:"salla",outcome:"failed"}}});
  return{userId:user.id,businessId:business.id,sessionToken,adminUserId:admin.id,adminSessionToken};
}

async function cleanupWorkspace(value:Seeded){
  await db.businessShortLink.deleteMany({where:{businessId:value.businessId}});
  await db.sallaWebhookEvent.deleteMany({where:{businessId:value.businessId}});
  await db.whatsAppCommerceIntegration.deleteMany({where:{businessId:value.businessId}});
  await db.workingHours.deleteMany({where:{businessId:value.businessId}});
  await db.analyticsEvent.deleteMany({where:{businessId:value.businessId}});
  await db.$executeRaw(Prisma.sql`DELETE FROM "BusinessNote" WHERE "businessId"=${value.businessId}`);
  await db.branch.deleteMany({where:{businessId:value.businessId}});
  await db.service.deleteMany({where:{businessId:value.businessId}});
  await db.subscription.deleteMany({where:{businessId:value.businessId}});
  await db.session.deleteMany({where:{userId:value.userId}});
  // Audit entries are append-only. Keep their tenant and actor in this disposable
  // test database; its container teardown removes the database as a whole.
  const hasAudit=await db.whatsAppAuditLog.count({where:{businessId:value.businessId}})>0;
  if(!hasAudit){
    await db.business.deleteMany({where:{id:value.businessId}});
    await db.authIdentity.deleteMany({where:{userId:value.userId}});
    await db.user.deleteMany({where:{id:value.userId}});
  }
  await db.session.deleteMany({where:{userId:value.adminUserId}});
  const designAudits = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "PlatformDesignAudit" WHERE "actorUserId"=${value.adminUserId}`;
  if (!Number(designAudits[0]?.count)) await db.user.deleteMany({where:{id:value.adminUserId,businesses:{none:{}}}});
}

async function authenticatedContext(browser:Browser,viewport:{width:number;height:number},theme:"light"|"dark",token:string):Promise<BrowserContext>{
  const context=await browser.newContext({viewport});
  await context.addCookies([{name:"hee_session",value:token,url:baseUrl}]);
  await context.addInitScript(([key,value])=>{try{localStorage.setItem(key,value);}catch{/* about:blank has an opaque origin */}},["infro-dashboard-theme",theme]);
  return context;
}

async function assertLanguageClearOfNavigation(page:Page){
  const collision=await page.evaluate(()=>{
    const language=document.querySelector<HTMLElement>("[data-language-switcher]")?.getBoundingClientRect();
    if(!language)return false;
    return [...document.querySelectorAll<HTMLElement>('nav[aria-label="التنقل السريع"],nav[aria-label="التنقل السريع للإدارة"]')].some(nav=>{
      const r=nav.getBoundingClientRect();
      return r.width>0&&r.height>0&&Math.min(r.right,language.right)>Math.max(r.left,language.left)&&Math.min(r.bottom,language.bottom)>Math.max(r.top,language.top);
    });
  });
  expect(collision).toBe(false);
}

async function auditRoute(context:BrowserContext,input:{path:string;expectedPath?:string;name:string;theme:"light"|"dark";viewportName:string}){
  const page=await context.newPage();
  await page.goto(`${baseUrl}${input.path}`,{waitUntil:"domcontentloaded"});
  expect(page.url()).not.toContain("/login");
  await expect(page.locator("[data-dashboard-path]")).toBeVisible();
  await page.waitForTimeout(350);
  await assertLanguageClearOfNavigation(page);
  const metrics=await page.evaluate(()=>{
    const root=document.querySelector<HTMLElement>("[data-dashboard-path]");
    const isLightSurface=(el:HTMLElement,minWidth=140,minHeight=72)=>{const r=el.getBoundingClientRect();if(r.width<minWidth||r.height<minHeight)return false;const rgb=getComputedStyle(el).backgroundColor.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number)??[];return rgb.length===3&&rgb.every(v=>v>220)};
    const largeLight=[...document.querySelectorAll<HTMLElement>("main section,main article")].filter(el=>isLightSurface(el,140,72)).length;
    const dashboardGrid=document.querySelector<HTMLElement>("#dashboard-main-content>div");
    const canvasWidth=document.querySelector<HTMLElement>("#dashboard-main-content")?.getBoundingClientRect().width??0;
    const directChildren=dashboardGrid?[...dashboardGrid.children].map((el,index)=>{const node=el as HTMLElement,r=node.getBoundingClientRect();return{index,tag:node.tagName.toLowerCase(),width:Math.round(r.width),height:Math.round(r.height),left:Math.round(r.left),top:Math.round(r.top),text:(node.innerText||"").replace(/\s+/g," ").trim().slice(0,80)}}):[];
    const rects=directChildren.map(item=>({left:item.left,right:item.left+item.width,top:item.top,bottom:item.top+item.height,width:item.width,height:item.height}));
    const splitExpected=canvasWidth>=1100;
    const minExpectedWidth=splitExpected?Math.max(500,canvasWidth*.42):Math.max(0,canvasWidth-40);
    const compressedDirectChildren=window.innerWidth>=1280?directChildren.filter(item=>item.width>0&&item.width<minExpectedWidth).length:0;
    const collisions=rects.flatMap((a,i)=>rects.slice(i+1).map(b=>({a,b}))).filter(({a,b})=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2).length;
    const workCards=[...document.querySelectorAll<HTMLElement>('section[aria-labelledby="work-center"] article')];
    let workCardChildCollisions=0,workCardChildOverflow=0,workCardLightIslands=0;
    for(const card of workCards){
      const cardRect=card.getBoundingClientRect();
      const children=[...card.children].map(el=>(el as HTMLElement).getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
      for(let i=0;i<children.length;i++){
        const a=children[i];
        if(a.left<cardRect.left-2||a.right>cardRect.right+2||a.top<cardRect.top-2||a.bottom>cardRect.bottom+2)workCardChildOverflow++;
        for(const b of children.slice(i+1))if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)workCardChildCollisions++;
      }
      workCardLightIslands += [...card.querySelectorAll<HTMLElement>("div,span")].filter(el=>isLightSurface(el,90,24)).length;
    }
    const stats=document.querySelector<HTMLElement>('section[aria-labelledby="work-center"]>div.grid.grid-cols-2');
    const statRects=stats?[...stats.children].map(el=>(el as HTMLElement).getBoundingClientRect()).filter(r=>r.width>0&&r.height>0):[];
    const statRowTops:number[]=[];
    for(const rect of statRects)if(!statRowTops.some(top=>Math.abs(top-rect.top)<=3))statRowTops.push(rect.top);
    return{path:root?.dataset.dashboardPath??null,theme:root?.dataset.dashboardTheme??null,overflow:document.documentElement.scrollWidth-window.innerWidth,largeLightSurfaces:largeLight,bodyHeight:document.body.scrollHeight,canvasWidth:Math.round(canvasWidth),splitExpected,minExpectedWidth:Math.round(minExpectedWidth),compressedDirectChildren,collisions,directChildren,workCardCount:workCards.length,workCardChildCollisions,workCardChildOverflow,workCardLightIslands,statsCount:statRects.length,statsRows:statRowTops.length};
  });
  const file=`${input.viewportName}-${input.theme}-${input.name}.png`;
  await page.screenshot({path:`${outDir}/${file}`,fullPage:true});
  await writeFile(`${outDir}/${input.viewportName}-${input.theme}-${input.name}.json`,JSON.stringify({...metrics,file,url:`${baseUrl}${input.path}`},null,2),"utf8");
  await page.close();
  expect(metrics.overflow).toBeLessThanOrEqual(2);
  expect(metrics.path).toBe(input.expectedPath??input.path.split("?")[0]);
  expect(metrics.theme).toBe(input.theme);
  if(input.theme==="dark")expect(metrics.largeLightSurfaces).toBe(0);
  if(input.name==="command-space"){
    expect(metrics.workCardCount).toBeGreaterThanOrEqual(3);
    expect(metrics.workCardChildCollisions).toBe(0);
    expect(metrics.workCardChildOverflow).toBe(0);
    expect(metrics.statsCount).toBe(4);
    if(input.theme==="dark")expect(metrics.workCardLightIslands).toBe(0);
    if(input.viewportName.startsWith("desktop")){
      expect(metrics.compressedDirectChildren).toBe(0);
      expect(metrics.collisions).toBe(0);
      if(metrics.canvasWidth>=1100)expect(metrics.statsRows).toBe(1);
    }
  }
  return{...metrics,file,url:`${baseUrl}${input.path}`};
}

async function auditPublicRoute(browser:Browser,input:{path:string;name:"homepage"|"register"|"login"|"business-page";viewportName:string;viewport:{width:number;height:number}}){
  const context=await browser.newContext({viewport:input.viewport});
  const page=await context.newPage();
  try{
    const response=await page.goto(`${baseUrl}${input.path}`,{waitUntil:"networkidle"});
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);
    const metrics=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-window.innerWidth,
      bodyHeight:document.body.scrollHeight,
      title:document.title,
      legacyAbout:[...document.querySelectorAll("a")].some(link=>(link.textContent??"").trim()==="عن iR"),
      appleRegistration:[...document.querySelectorAll("a")].some(link=>(link.textContent??"").includes("Apple")),
      brokenImages:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.currentSrc||image.src),
    }));
    const reading = await page.locator('[data-infro-home], [data-public-page], [data-auth-page]').first().evaluate(root => {
      const style = getComputedStyle(root);
      const fields = [...root.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),select,textarea')].filter(node => node.getBoundingClientRect().width > 0);
      return {font: style.fontFamily, size: parseFloat(style.fontSize), smallFields: fields.filter(node => parseFloat(getComputedStyle(node).fontSize) < 16).length};
    });
    expect(reading.font.toLowerCase()).toContain('ibm');
    expect(reading.size).toBeGreaterThanOrEqual(16);
    expect(reading.smallFields).toBe(0);
    if(input.name==="homepage"){
      await expect(page.getByRole("heading",{name:/هويتك الرقمية والتسويقية/})).toBeVisible();
      await expect(page.getByRole("link",{name:"عن INFRO"}).first()).toBeVisible();
      expect(metrics.title).toContain("INFRO");
      expect(metrics.legacyAbout).toBe(false);
      const screen=page.locator("[data-home-phone-screen]");
      await screen.scrollIntoViewIfNeeded();
      await expect(page.frameLocator('iframe[title="نموذج صفحة عميل INFRO"]').locator("h1")).toContainText("شركة الرواد للمقاولات");
      const phone=await screen.boundingBox();
      expect(phone).not.toBeNull();
      expect(phone!.height/phone!.width).toBeCloseTo(844/390,1);
      const frame=page.frameLocator('iframe[title="نموذج صفحة عميل INFRO"]');
      await expect(frame.locator("[data-public-profile-slot]")).toHaveCount(1);
      if(input.viewport.width<1024){
        const opener=page.getByRole("button",{name:"فتح القائمة"});
        await opener.click();
        const menu=page.getByRole("dialog",{name:"قائمة التنقل"});
        await expect(menu).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).not.toBeVisible();
        await expect(opener).toBeFocused();
      }
      await page.evaluate(()=>window.scrollTo(0,0));
    }else if(input.name==="business-page"){
      await expect(page.getByRole("heading",{name:"شركة الرواد للمقاولات"})).toBeVisible();
      await expect(page.locator('section[aria-labelledby="intent-title"]')).toBeVisible();
      await expect(page.getByRole("heading",{name:"أبرز ما نقدمه"})).toBeVisible();
      expect(await page.locator("[data-public-social-slot]").count()).toBe(1);
      expect(await page.locator("[data-public-profile-slot]").count()).toBe(1);
      const clippedActionLabels=await page.locator("[data-public-action-ribbon] a span").evaluateAll(nodes=>nodes.filter(node=>node.scrollWidth>node.clientWidth+1).length);
      expect(clippedActionLabels).toBe(0);
    }else if(input.name==="register"){
      await expect(page.getByRole("heading",{name:"إنشاء حساب INFRO"})).toBeVisible();
      await expect(page.getByRole("link",{name:/Google/})).toBeVisible();
      expect(metrics.appleRegistration).toBe(false);
    }else{
      await expect(page.getByRole("heading",{name:"تسجيل الدخول"})).toBeVisible();
    }
    expect(metrics.overflow).toBeLessThanOrEqual(2);
    expect(metrics.brokenImages).toEqual([]);
    const file=`${input.viewportName}-${input.name}.png`;
    await page.screenshot({path:`${outDir}/${file}`,fullPage:true});
    await writeFile(`${outDir}/${input.viewportName}-${input.name}.json`,JSON.stringify({...metrics,file,url:`${baseUrl}${input.path}`},null,2),"utf8");
    return{...metrics,file,url:`${baseUrl}${input.path}`};
  }finally{
    await page.close();
    await context.close();
  }
}

async function auditAdminRoute(browser:Browser,input:{theme:"light"|"dark";viewportName:string;viewport:{width:number;height:number};token:string;businessId:string}){
  const context=await authenticatedContext(browser,input.viewport,input.theme,input.token);
  const page=await context.newPage();
  try{
    const response=await page.goto(`${baseUrl}/admin`,{waitUntil:"domcontentloaded"});
    expect(response?.status()).toBe(200);
    await expect(page.locator("[data-admin-shell]")).toBeVisible();
    await assertLanguageClearOfNavigation(page);
    const metrics=await page.evaluate(()=>{
      const lightSurfaces=[...document.querySelectorAll<HTMLElement>("main section,main article")].filter(el=>{const r=el.getBoundingClientRect();const rgb=getComputedStyle(el).backgroundColor.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number)??[];return r.width>=140&&r.height>=72&&rgb.length===3&&rgb.every(value=>value>220)}).length;
      return{overflow:document.documentElement.scrollWidth-window.innerWidth,brokenImages:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.currentSrc||image.src),lightSurfaces};
    });
    expect(metrics.overflow).toBeLessThanOrEqual(2);
    expect(metrics.brokenImages).toEqual([]);
    if(input.theme==="dark")expect(metrics.lightSurfaces).toBe(0);
    const file=`${input.viewportName}-${input.theme}-admin-dashboard.png`;
    await page.screenshot({path:`${outDir}/${file}`,fullPage:true});
    await writeFile(`${outDir}/${input.viewportName}-${input.theme}-admin-dashboard.json`,JSON.stringify({...metrics,file,url:`${baseUrl}/admin`},null,2),"utf8");
    const results:unknown[]=[{...metrics,file,url:`${baseUrl}/admin`}];
    const commerceResponse=await page.goto(`${baseUrl}/admin/commerce`,{waitUntil:"domcontentloaded",timeout:30_000});
    expect(commerceResponse?.status()).toBe(200);
    await expect(page.getByRole("heading",{name:"صحة تكاملات المتاجر",exact:true})).toBeVisible();
    await expect(page.getByText("المزامنة متأخرة",{exact:true})).toBeVisible();
    await expect(page.getByText("COMMERCE_OPERATION_FAILED",{exact:true})).toBeVisible();
    await expect(page.locator("main")).not.toContainText("DO_NOT_RENDER_COMMERCE_SECRET");
    await assertLanguageClearOfNavigation(page);
    const commerceMetrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,lightSurfaces:[...document.querySelectorAll<HTMLElement>("main section,main article")].filter(el=>{const r=el.getBoundingClientRect();const rgb=getComputedStyle(el).backgroundColor.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number)??[];return r.width>=140&&r.height>=72&&rgb.length===3&&rgb.every(value=>value>220)}).length}));
    expect(commerceMetrics.overflow).toBeLessThanOrEqual(2);
    if(input.theme==="dark")expect(commerceMetrics.lightSurfaces).toBe(0);
    const commerceFile=`${input.viewportName}-${input.theme}-admin-commerce.png`;
    await page.screenshot({path:`${outDir}/${commerceFile}`,fullPage:true});
    results.push({...commerceMetrics,file:commerceFile,url:`${baseUrl}/admin/commerce`});
    await page.goto(`${baseUrl}/admin/design`);
    await expect(page.getByRole("heading",{name:"الهوية وتصميم المنصة",exact:true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    await page.screenshot({path:`${outDir}/${input.viewportName}-${input.theme}-platform-design.png`,fullPage:true});
    const detailPath=`/admin/businesses/${input.businessId}`;
    const detailResponse=await page.goto(`${baseUrl}${detailPath}`,{waitUntil:"domcontentloaded"});
    expect(detailResponse?.status()).toBe(200);
    await expect(page.getByRole("heading",{name:"استثناء رابط علامة محمية"})).toBeVisible();
    await expect(page.getByLabel("اسم الرابط المحمي")).toBeVisible();
    await expect(page.getByLabel("مرجع التفويض أو مبرر الملكية")).toBeVisible();
    const detailMetrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-window.innerWidth,brokenImages:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.currentSrc||image.src),protectedSurfaceBackground:getComputedStyle(document.querySelector<HTMLElement>(".protected-slug-control")!).backgroundColor}));
    expect(detailMetrics.overflow).toBeLessThanOrEqual(2);
    expect(detailMetrics.brokenImages).toEqual([]);
    if(input.theme==="dark")expect(detailMetrics.protectedSurfaceBackground).toBe("rgb(8, 29, 32)");
    const detailFile=`${input.viewportName}-${input.theme}-admin-protected-slug.png`;
    await page.screenshot({path:`${outDir}/${detailFile}`,fullPage:true});
    await writeFile(`${outDir}/${input.viewportName}-${input.theme}-admin-protected-slug.json`,JSON.stringify({...detailMetrics,file:detailFile,url:`${baseUrl}${detailPath}`},null,2),"utf8");
    results.push({...detailMetrics,file:detailFile,url:`${baseUrl}${detailPath}`});
    return results;
  }finally{
    await page.close();
    await context.close();
  }
}

test.describe.serial("authenticated INFRO visual audit",()=>{
  test("stale login actions recover with a GET, never replay credentials, and cannot reload in a loop", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    let actionPosts = 0;
    let documents = 0;
    await page.route("**/login", async route => {
      if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
        actionPosts++;
        await route.fulfill({ status: 404, headers: { "x-nextjs-action-not-found": "1", "content-type": "text/plain" }, body: "Server action not found" });
      } else {
        if (route.request().isNavigationRequest()) documents++;
        await route.continue();
      }
    });
    try {
      await page.goto(`${baseUrl}/login`);
      await page.locator('input[name="email"]').fill("stale-action-test@example.com");
      await page.locator('input[name="password"]').fill("synthetic-test-not-a-credential");
      await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
      await expect(page.getByRole("heading", { name: "تتوفر نسخة أحدث من المنصة" })).toBeVisible();
      await expect.poll(() => documents).toBe(2);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      expect(actionPosts).toBe(1);
      await page.locator('input[name="email"]').fill("stale-action-test@example.com");
      await page.locator('input[name="password"]').fill("synthetic-test-not-a-credential");
      await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
      await expect(page.getByRole("heading", { name: "تتوفر نسخة أحدث من المنصة" })).toBeVisible();
      await page.waitForTimeout(2200); // Prove the one-shot recovery does not loop.
      expect(documents).toBe(2);
      expect(actionPosts).toBe(2);
      await expect(page.getByRole("button", { name: "إعادة المحاولة", exact: true })).toHaveCount(0);
      await page.screenshot({ path: `${outDir}/mobile-stale-action-recovery.png`, fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: `${outDir}/desktop-stale-action-recovery.png`, fullPage: true });
      await page.getByRole("button", { name: "إعادة تحميل الصفحة", exact: true }).click();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      expect(actionPosts).toBe(2);
    } finally { await context.close(); }
  });
  test.beforeAll(async()=>{await mkdir(outDir,{recursive:true});const connectionString=String(process.env.DATABASE_URL??"").trim();if(!connectionString)throw new Error("DATABASE_URL is required");pool=new Pool({connectionString,max:4});db=new PrismaClient({adapter:new PrismaPg(pool)});seeded=await seedWorkspace();});
  test.afterAll(async()=>{if(seeded)await cleanupWorkspace(seeded);await db?.$disconnect();await pool?.end();});
  test("contact removal and number disconnect preserve history and reject foreign tenant targets", async ({ browser }) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("fixture missing");
    const businessId = seeded.businessId;
    const plan = await db.businessPlan.findUniqueOrThrow({ where: { code: "BUSINESS" } });
    const previousSubscription = await db.subscription.findFirst({ where: { businessId, status: "active" } });
    const subscription = previousSubscription
      ? await db.subscription.update({ where: { id: previousSubscription.id }, data: { planId: plan.id } })
      : await db.subscription.create({ data: { businessId, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 86_400_000), autoRenew: false } });
    const foreignBusiness = await db.business.create({ data: { ownerId: seeded.adminUserId, name: "Foreign removal fixture", slug: `remove-${crypto.randomUUID()}`, businessType: "test" } });
    const foreign = await db.whatsAppContact.create({ data: { businessId: foreignBusiness.id, phoneE164: "+966500000851", source: "manual" } });
    const contact = await db.whatsAppContact.create({ data: { businessId, phoneE164: foreign.phoneE164, displayName: "جهة الحذف التجريبية", source: "manual" } });
    const retained = await db.whatsAppContact.create({ data: { businessId, phoneE164: "+966500000852", displayName: "جهة الحذف الجماعي", source: "manual" } });
    await db.whatsAppConsent.create({ data: { businessId, phoneE164: contact.phoneE164, source: "manual", evidence: "CI only", consentedAt: new Date() } });
    const connection = await db.whatsAppConnection.create({ data: { businessId, status: "connected", phoneNumberId: `disconnect-${crypto.randomUUID()}`, wabaId: `disconnect-${crypto.randomUUID()}`, displayPhoneNumber: "+966500000850", credentialEnvelope: { testOnly: true } } });
    const template = await db.whatsAppTemplate.create({ data: { businessId, connectionId: connection.id, providerTemplateId: crypto.randomUUID(), name: "removal_test", language: "ar", category: "marketing", status: "approved", providerStatus: "APPROVED", lastSyncedAt: new Date(), components: [], rawPayload: {} } });
    const campaign = await db.whatsAppCampaign.create({ data: { businessId, connectionId: connection.id, templateId: template.id, name: "سجل محفوظ", status: "draft", audienceDefinition: { kind: "all_contacts" } } });
    const recipient = await db.whatsAppCampaignRecipient.create({ data: { businessId, campaignId: campaign.id, contactId: contact.id, phoneE164: contact.phoneE164, status: "queued" } });
    const job = await db.whatsAppDeliveryJob.create({ data: { businessId, campaignId: campaign.id, connectionId: connection.id, recipientId: recipient.id, idempotencyKey: crypto.randomUUID(), status: "queued" } });
    const signup = await db.whatsAppEmbeddedSignupSession.create({ data: { businessId, initiatedByUserId: seeded.userId, stateDigest: crypto.randomUUID(), phoneNumberId: connection.phoneNumberId, status: "token_exchanged", credentialEnvelope: { testOnly: true }, expiresAt: new Date(Date.now() + 600_000) } });
    const context = await authenticatedContext(browser, { width: 390, height: 844 }, "dark", seeded.sessionToken);
    try {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/dashboard/whatsapp/contacts`);
      await page.getByRole("button", { name: "تحديد جهات للحذف", exact: true }).click();
      await page.getByLabel(/جهة الحذف التجريبية/).check();
      await page.getByRole("button", { name: "حذف المحدد (1)", exact: true }).click();
      await expect(page.getByRole("button", { name: "تأكيد حذف جهات الاتصال", exact: true })).toBeDisabled();
      await page.getByLabel("اكتب «حذف» للتأكيد").fill("حذف");
      await page.screenshot({ path: `${outDir}/mobile-dark-contact-removal.png`, fullPage: true });
      // A forged hidden target must not affect another tenant, even for the same phone.
      await page.locator('input[name="contactId"]').evaluate((element, id) => { (element as HTMLInputElement).value = id; }, foreign.id);
      await page.getByRole("button", { name: "تأكيد حذف جهات الاتصال", exact: true }).click();
      await expect(page).toHaveURL(/remove=CONTACT_REMOVAL_CHANGED/);
      expect((await db.whatsAppContact.findUniqueOrThrow({ where: { id: foreign.id } })).deletedAt).toBeNull();
      expect((await db.whatsAppContact.findUniqueOrThrow({ where: { id: contact.id } })).deletedAt).toBeNull();
      await page.goto(`${baseUrl}/dashboard/whatsapp/contacts`);
      await page.getByRole("button", { name: "تحديد جهات للحذف", exact: true }).click();
      await page.getByLabel(/جهة الحذف التجريبية/).check();
      await page.getByRole("button", { name: "حذف المحدد (1)", exact: true }).click();
      await page.getByLabel("اكتب «حذف» للتأكيد").fill("حذف");
      await page.getByRole("button", { name: "تأكيد حذف جهات الاتصال", exact: true }).click();
      await expect(page).toHaveURL(/remove=complete&removed=1/);
      const removed = await db.whatsAppContact.findUniqueOrThrow({ where: { id: contact.id } });
      expect(removed.deletedAt).not.toBeNull(); expect(removed.optedOutAt).not.toBeNull();
      expect((await db.whatsAppConsent.findFirstOrThrow({ where: { businessId, phoneE164: contact.phoneE164 } })).revokedAt).not.toBeNull();
      expect((await db.whatsAppDeliveryJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("cancelled");
      expect(await db.whatsAppCampaignRecipient.count({ where: { id: recipient.id } })).toBe(1);
      expect((await db.whatsAppContact.findUniqueOrThrow({ where: { id: retained.id } })).deletedAt).toBeNull();
      await page.getByRole("button", { name: /حذف جميع جهات الاتصال/ }).click();
      await page.getByLabel("اكتب «حذف» للتأكيد").fill("حذف");
      await page.getByRole("button", { name: "تأكيد حذف جهات الاتصال", exact: true }).click();
      // Both actions redirect to the same success URL; wait for the new server-rendered count.
      await expect(page.getByRole("button", { name: "حذف جميع جهات الاتصال (0)", exact: true })).toBeDisabled();
      await expect(page).toHaveURL(/remove=complete/);
      expect(await db.whatsAppContact.count({ where: { businessId, deletedAt: null } })).toBe(0);
      expect((await db.whatsAppContact.findUniqueOrThrow({ where: { id: foreign.id } })).deletedAt).toBeNull();
      await page.setViewportSize({ width: 1440, height: 960 });
      await page.goto(`${baseUrl}/dashboard/whatsapp/setup`);
      await page.getByRole("button", { name: "إلغاء ربط الرقم", exact: true }).click();
      await page.getByLabel("أؤكد إلغاء ربط هذا الرقم وإيقاف استخدامه في المنشأة").check();
      await page.screenshot({ path: `${outDir}/desktop-dark-disconnect-number.png`, fullPage: true });
      await page.getByRole("button", { name: "تأكيد إلغاء الربط", exact: true }).click();
      await expect(page).toHaveURL(/disconnect=complete/);
      const disconnected = await db.whatsAppConnection.findUniqueOrThrow({ where: { id: connection.id } });
      expect(disconnected.status).toBe("disconnected"); expect(disconnected.credentialEnvelope).toBeNull();
      expect(disconnected.marketingEnabled).toBe(false); expect(disconnected.bookingEnabled).toBe(false);
      expect((await db.whatsAppCampaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe("cancelled");
      expect((await db.whatsAppEmbeddedSignupSession.findUniqueOrThrow({ where: { id: signup.id } })).status).toBe("cancelled");
      expect(await db.whatsAppAuditLog.count({ where: { businessId, action: "contacts.remove", outcome: "success" } })).toBeGreaterThanOrEqual(2);
    } finally {
      await context.close();
      await db.whatsAppDeliveryJob.deleteMany({ where: { campaignId: campaign.id } });
      await db.whatsAppCampaignRecipient.deleteMany({ where: { campaignId: campaign.id } });
      await db.whatsAppCampaign.delete({ where: { id: campaign.id } });
      await db.whatsAppTemplate.delete({ where: { id: template.id } });
      await db.whatsAppEmbeddedSignupSession.delete({ where: { id: signup.id } });
      await db.whatsAppConnection.delete({ where: { id: connection.id } });
      await db.whatsAppConsent.deleteMany({ where: { businessId, phoneE164: contact.phoneE164 } });
      await db.whatsAppContact.deleteMany({ where: { id: { in: [contact.id, retained.id, foreign.id] } } });
      await db.business.delete({ where: { id: foreignBusiness.id } });
      if (previousSubscription) await db.subscription.update({ where: { id: subscription.id }, data: { planId: previousSubscription.planId } });
      else await db.subscription.delete({ where: { id: subscription.id } });
    }
  });

  test("platform identity uploads stay private until publication and render on mobile and desktop", async ({browser}) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("visual fixture missing");
    const previous = await db.$queryRaw<Array<{draft:unknown;published:unknown;publishedAt:Date|null}>>`SELECT "draft","published","publishedAt" FROM "PlatformDesignSetting" WHERE "key"='platform.brand.v1'`;
    const admin = await authenticatedContext(browser,{width:1440,height:960},"light",seeded.adminSessionToken);
    const anonymous = await browser.newContext();
    let asset = "";
    try {
      const page = await admin.newPage();
      await page.goto(`${baseUrl}/admin/design`);
      await expect(page.getByRole("heading",{name:"الهوية وتصميم المنصة",exact:true})).toBeVisible();
      const symbol = page.getByRole("group", {name:"أيقونة المنصة",exact:true});
      await symbol.locator('input[type="file"]').setInputFiles("public/brand/infro-symbol-approved.png");
      await expect(symbol.locator('input[name="symbolUrl"]')).toHaveValue(/\/api\/storage\//);
      asset = await symbol.locator('input[name="symbolUrl"]').inputValue();
      expect((await anonymous.request.get(`${baseUrl}${asset}`)).status()).toBe(404);
      await page.locator('input[name="faviconUrl"]').fill(asset);
      await page.getByLabel("العنوان الرئيسي",{exact:true}).fill("هوية تجريبية قابلة للتحكم");
      await expect(page.getByRole("heading", {name:"هوية تجريبية قابلة للتحكم",exact:true})).toBeVisible();
      await page.getByRole("button", {name:"حفظ مسودة",exact:true}).click();
      await expect.poll(async () => (await db.$queryRaw<Array<{draft:{symbolUrl?:string}}>>`SELECT "draft" FROM "PlatformDesignSetting" WHERE "key"='platform.brand.v1'`)[0]?.draft.symbolUrl).toBe(asset);
      expect((await anonymous.request.get(`${baseUrl}${asset}`)).status()).toBe(404);
      await page.reload();
      for (const width of [1440,390]) {
        await page.setViewportSize({width,height:960});
        await page.screenshot({path:`${outDir}/platform-design-${width}.png`,fullPage:true});
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
      await page.getByRole("button", {name:"نشر التعديلات",exact:true}).click();
      await expect.poll(async () => (await anonymous.request.get(`${baseUrl}${asset}`)).status()).toBe(200);
      const publicPage = await anonymous.newPage();
      await publicPage.goto(baseUrl);
      await expect(publicPage.getByRole("heading", {level:1})).toHaveText("هوية تجريبية قابلة للتحكم");
      await expect(publicPage.locator('link[rel="icon"]')).toHaveAttribute("href", asset);
      await expect(publicPage.locator('header img').first()).toHaveAttribute("src", asset);
      await page.getByRole("button", {name:"استعادة الافتراضي كمسودة",exact:true}).click();
      await expect.poll(async () => (await db.$queryRaw<Array<{draft:{symbolUrl?:string|null}}>>`SELECT "draft" FROM "PlatformDesignSetting" WHERE "key"='platform.brand.v1'`)[0]?.draft.symbolUrl).toBe(null);
      expect((await anonymous.request.get(`${baseUrl}${asset}`)).status()).toBe(200);
    } finally {
      if (previous[0]) await db.$executeRaw(Prisma.sql`UPDATE "PlatformDesignSetting" SET "draft"=${JSON.stringify(previous[0].draft)}::jsonb,"published"=${JSON.stringify(previous[0].published)}::jsonb,"publishedAt"=${previous[0].publishedAt} WHERE "key"='platform.brand.v1'`);
      else await db.$executeRaw`DELETE FROM "PlatformDesignSetting" WHERE "key"='platform.brand.v1'`;
      await db.$executeRaw`DELETE FROM "PlatformDesignAudit" WHERE "actorUserId"=${seeded.adminUserId}`;
      if (asset) await db.storedObject.deleteMany({where:{id:asset.split("/").pop(),folder:"platform-brand"}});
      await admin.close(); await anonymous.close();
    }
  });
  test("commerce operations deny a regular customer session",async({browser})=>{
    if(!seeded)throw new Error("visual fixture missing");
    const context=await authenticatedContext(browser,{width:390,height:844},"light",seeded.sessionToken);
    try{const page=await context.newPage();await page.goto(`${baseUrl}/admin/commerce`);await expect(page).toHaveURL(/\/admin-login/);await expect(page.getByRole("heading",{name:"صحة تكاملات المتاجر",exact:true})).toHaveCount(0);}finally{await context.close();}
  });
  test("customer workspace search, live controls and real analytics stay usable", async ({browser}) => {
    test.setTimeout(120_000);
    if(!seeded)throw new Error("visual fixture missing");
    for(const viewport of [{width:1440,height:960},{width:390,height:844}]) for(const theme of ["light","dark"] as const) {
      const context=await authenticatedContext(browser,viewport,theme,seeded.sessionToken);
      const page=await context.newPage();
      try {
        await page.goto(`${baseUrl}/dashboard`);
        await expect(page.getByRole("heading",{name:"من الزيارة إلى التواصل"})).toBeVisible();
        const canvas=await page.locator("#dashboard-main-content").boundingBox();
        const hero=page.locator(".infro-workspace-hero");
        const heroBox=await hero.boundingBox();
        const performanceBox=await page.locator('[aria-labelledby="workspace-performance"]').boundingBox();
        expect(heroBox!.width).toBeGreaterThanOrEqual(canvas!.width-2);
        expect(performanceBox!.width).toBeGreaterThanOrEqual(canvas!.width-2);
        if(canvas!.width>=900) {
          const groups=page.locator(".infro-priority-groups > section");
          const first=await groups.nth(0).boundingBox(),second=await groups.nth(1).boundingBox();
          expect(Math.abs(first!.y-second!.y)).toBeLessThanOrEqual(2);
          for(const card of await page.locator(".infro-priority-cards > article").all()) {
            expect((await card.boundingBox())!.width).toBeGreaterThanOrEqual(220);
          }
        }
        expect(await hero.locator("h1").evaluate(el=>getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
        await page.screenshot({path:`${outDir}/${viewport.width<1024?"mobile":"desktop"}-${theme}-customer-workspace.png`,fullPage:true});
        const refresh=page.getByRole("region",{name:"تحديث بيانات مساحة العمل"});
        await refresh.getByRole("button",{name:"إيقاف التحديث",exact:true}).click();
        await expect(refresh).toContainText("التحديث التلقائي متوقف");
        await refresh.getByRole("button",{name:"تحديث البيانات",exact:true}).click();
        await expect(refresh.getByRole("button",{name:"تحديث البيانات",exact:true})).toBeEnabled();
        if(viewport.width<1024)await page.getByRole("button",{name:"فتح المزيد من الأدوات"}).click();
        const search=page.getByLabel(viewport.width<1024?"البحث في قائمة الجوال":"البحث في أقسام اللوحة",{exact:true});
        await search.fill("الأداء");
        const navigation=page.getByRole("navigation",{name:viewport.width<1024?"كل أدوات لوحة العميل":"التنقل الرئيسي",exact:true});
        await expect(navigation.getByRole("link",{name:"الأداء",exact:true})).toBeVisible();
        await expect(navigation.getByRole("link",{name:"مذكرات الأعمال",exact:true})).toHaveCount(0);
        await search.fill("لايوجدقسمبهذاالاسم");
        await expect(navigation).toContainText("لا توجد أقسام بهذا الاسم.");
        await search.fill("الأداء");
        await navigation.getByRole("link",{name:"الأداء",exact:true}).click();
        await expect(page).toHaveURL(/\/dashboard\/analytics/);
        await expect(page.getByRole("region",{name:"تحديث بيانات مساحة العمل"})).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
        await page.goto(`${baseUrl}/dashboard/support`);
        const help=page.locator('[aria-labelledby="help-guides-title"]');
        await help.getByLabel("البحث في أدلة المساعدة",{exact:true}).fill("مراجعة القالب");
        await help.locator("summary").filter({hasText:"مراجعة القالب قبل الحملة"}).click();
        await expect(help.getByRole("link",{name:"فتح القسم",exact:true})).toHaveAttribute("href","/dashboard/whatsapp/templates");
        await help.getByRole("link",{name:"طلب مساعدة بهذا القسم",exact:true}).click();
        await expect(page).toHaveURL(/context=templates/);
        await expect(page.getByText("طلب مساعدة بخصوص:")).toBeVisible();
        await expect(page.getByLabel("نوع الطلب",{exact:true})).toHaveValue("technical");
        await help.getByLabel("البحث في أدلة المساعدة",{exact:true}).fill("لايوجددليلبهذاالاسم");
        await expect(help).toContainText("لا توجد أدلة تطابق البحث والتصنيف.");
        await help.getByRole("button",{name:"عرض جميع الأدلة",exact:true}).click();
        await expect(help.locator("details")).toHaveCount(7);
        const rights=page.getByRole("link",{name:"فتح دورة الحذف",exact:true});
        expect(await rights.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe("rgb(53, 228, 203)");
        expect(await rights.evaluate(el=>getComputedStyle(el).color)).toBe("rgb(7, 24, 27)");
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:`${outDir}/${viewport.width<1024?"mobile":"desktop"}-${theme}-help-customer-workspace.png`,fullPage:true});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
      } finally {await context.close();}
    }
  });

  test("captures launch-critical public and authenticated surfaces without overflow, collisions, light islands or compressed grids",async({browser})=>{
    test.setTimeout(600_000);if(!seeded)throw new Error("visual fixture missing");
    const routes=[{path:"/dashboard",name:"command-space"},{path:"/dashboard/notes",name:"business-memory"},{path:"/dashboard/reminders",name:"smart-reminders"},{path:"/dashboard/digital-identity",name:"digital-identity"},{path:"/dashboard/tools",name:"tools"},{path:"/dashboard/verification",name:"verification"},{path:"/dashboard/billing/manage",name:"billing"},{path:"/dashboard/whatsapp",expectedPath:"/dashboard/billing/manage",name:"whatsapp-gate"}];
    routes.push({path:"/dashboard/my-page",name:"my-page"},{path:"/dashboard/working-hours",name:"booking-schedule"},{path:"/dashboard/services",name:"services"},{path:"/dashboard/inbox",name:"inbox"},{path:"/dashboard/settings",name:"settings"});
    routes.push({path:"/dashboard/support?context=meta",name:"contextual-support"});
    routes.push({path:"/dashboard/analytics",name:"customer-performance"},{path:"/dashboard/notifications",name:"notifications"},{path:"/dashboard/branding",name:"branding"},{path:"/dashboard/directory",name:"directory"},{path:"/dashboard/catalog",expectedPath:"/dashboard/my-page",name:"catalog"},{path:"/dashboard/products",expectedPath:"/dashboard/my-page",name:"products"},{path:"/dashboard/gallery",expectedPath:"/dashboard/my-page",name:"gallery"},{path:"/dashboard/offers",expectedPath:"/dashboard/my-page",name:"offers"},{path:"/dashboard/contact-links",expectedPath:"/dashboard/my-page",name:"contact-links"},{path:"/dashboard/share",expectedPath:"/dashboard/my-page",name:"share"});
    const viewports=[{name:"desktop",value:{width:1440,height:960}},{name:"mobile",value:{width:390,height:844}}] as const;
    const results:unknown[]=[];
    for(const viewport of viewports)for(const theme of ["light","dark"] as const){const context=await authenticatedContext(browser,viewport.value,theme,seeded.sessionToken);try{for(const route of routes)results.push(await auditRoute(context,{...route,theme,viewportName:viewport.name}));}finally{await context.close();}}
    for(const theme of ["light","dark"] as const){const context=await authenticatedContext(browser,{width:1536,height:1024},theme,seeded.sessionToken);try{results.push(await auditRoute(context,{path:"/dashboard",name:"command-space",theme,viewportName:"desktop-wide"}));}finally{await context.close();}}
    for(const publicViewport of [{viewportName:"public-desktop",viewport:{width:1440,height:960}},{viewportName:"public-tablet",viewport:{width:768,height:1024}},{viewportName:"public-mobile",viewport:{width:390,height:844}}]){
      results.push(await auditPublicRoute(browser,{path:"/",name:"homepage",...publicViewport}));
      results.push(await auditPublicRoute(browser,{path:"/register",name:"register",...publicViewport}));
      results.push(await auditPublicRoute(browser,{path:"/login",name:"login",...publicViewport}));
      results.push(await auditPublicRoute(browser,{path:"/demo",name:"business-page",...publicViewport}));
    }
    for(const adminViewport of [{viewportName:"desktop",viewport:{width:1440,height:960}},{viewportName:"tablet",viewport:{width:768,height:1024}},{viewportName:"mobile",viewport:{width:390,height:844}}])for(const theme of ["light","dark"] as const)results.push(...await auditAdminRoute(browser,{...adminViewport,theme,token:seeded.adminSessionToken,businessId:seeded.businessId}));
    await writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2),"utf8");
  });
  test("account sessions are private and revocation preserves the current login", async ({ browser }) => {
    test.setTimeout(120_000);
    if (!seeded) throw new Error("seed missing");
    const { userId, adminUserId, sessionToken } = seeded;
    const otherToken = crypto.randomUUID(), foreignToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600_000);
    const other = await db.session.create({ data: { userId, token: otherToken, expiresAt } });
    const foreign = await db.session.create({ data: { userId: adminUserId, token: foreignToken, expiresAt } });
    const current = await db.session.findUniqueOrThrow({ where: { token: sessionToken } });
    try {
      for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 960 }]) {
        for (const theme of ["light", "dark"] as const) {
          const context = await authenticatedContext(browser, viewport, theme, sessionToken);
          try {
            const page = await context.newPage(); page.setDefaultTimeout(15_000);
            await page.goto(`${baseUrl}/dashboard/settings/sessions`);
            await expect(page.getByRole("heading", { name: "جلسات الدخول", exact: true })).toBeVisible();
            await expect(page.locator('section[aria-label="قائمة جلسات الحساب"] article')).toHaveCount(2);
            expect(await page.content()).not.toContain(otherToken);
            expect(await page.content()).not.toContain(foreignToken);
            expect(await page.content()).not.toContain(foreign.id);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
            await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-account-sessions.png`, fullPage: true });
          } finally { await context.close(); }
        }
      }
      const context = await authenticatedContext(browser, { width: 390, height: 844 }, "light", sessionToken);
      try {
        const page = await context.newPage(); page.setDefaultTimeout(15_000);
        page.on("dialog", dialog => dialog.accept());
        await page.goto(`${baseUrl}/dashboard/settings/sessions`);
        await page.locator('input[name="sessionId"]').evaluate((element, value) => { (element as HTMLInputElement).value = value; }, foreign.id);
        await page.getByRole("button", { name: "إنهاء الجلسة", exact: true }).click();
        await expect(page).toHaveURL(/result=unchanged/);
        expect(await db.session.findUnique({ where: { id: foreign.id } })).not.toBeNull();
        await page.locator('input[name="sessionId"]').evaluate((element, value) => { (element as HTMLInputElement).value = value; }, current.id);
        await page.getByRole("button", { name: "إنهاء الجلسة", exact: true }).click();
        await expect(page).toHaveURL(/result=current/);
        await page.getByRole("button", { name: "إنهاء جميع الجلسات الأخرى", exact: true }).click();
        await expect(page).toHaveURL(/result=revoked/);
        await expect(page.locator('section[aria-label="قائمة جلسات الحساب"] article')).toHaveCount(1);
        expect(await db.session.findUnique({ where: { id: other.id } })).toBeNull();
        expect(await db.session.findUnique({ where: { id: current.id } })).not.toBeNull();
        expect(await db.session.findUnique({ where: { id: foreign.id } })).not.toBeNull();
      } finally { await context.close(); }
      const revokedContext = await authenticatedContext(browser, { width: 390, height: 844 }, "light", otherToken);
      try { const page = await revokedContext.newPage(); await page.goto(`${baseUrl}/dashboard/settings/sessions`); await expect(page).toHaveURL(/\/login/); } finally { await revokedContext.close(); }
    } finally { await db.session.deleteMany({ where: { id: { in: [other.id, foreign.id] } } }); }
  });

  test("commerce workspace isolates carts and offers compatible Arabic template drafts", async ({ browser }) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("visual fixture missing");
    const businessId = seeded.businessId;
    const suffix = crypto.randomUUID();
    const plan = await db.businessPlan.upsert({ where: { code: "BUSINESS" }, update: {}, create: { code: "BUSINESS", name: "Business", monthlyPrice: 99, productLimit: 10, isActive: true } });
    const subscription = await db.subscription.create({ data: { businessId, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now()-60_000), endsAt: new Date(Date.now()+86_400_000), autoRenew: false } });
    const foreign = await db.business.create({ data: { ownerId: seeded.adminUserId, planId: plan.id, name: "FOREIGN_CART_PRIVATE", slug: `cart-foreign-${suffix}`, businessType: "test" } });
    const contact = await db.whatsAppContact.create({ data: { businessId, phoneE164: "+966500000119", displayName: "عميل اختبار السلة", source: "manual" } });
    const otherContact = await db.whatsAppContact.create({ data: { businessId: foreign.id, phoneE164: "+966500000118", displayName: "FOREIGN_CART_PRIVATE", source: "manual" } });
    const connection = await db.whatsAppConnection.create({ data: { businessId, status: "connected", wabaId: `cart-${suffix}`, phoneNumberId: `cart-${suffix}`, marketingEnabled: true, credentialEnvelope: { testOnly: true } } });
    await db.whatsAppAutomationCart.createMany({ data: [
      { businessId, contactId: contact.id, cartId: "cart-visible", state: "abandoned", sourceEventId: `own-${suffix}`, occurredAt: new Date() },
      { businessId: foreign.id, contactId: otherContact.id, cartId: "FOREIGN_CART_PRIVATE", state: "abandoned", sourceEventId: `other-${suffix}`, occurredAt: new Date() },
    ] });
    try {
      const providerId = `${Date.now()}123`;
      const payload = { name: "review_receipt_test", language: "ar", category: "UTILITY", components: [{ type: "BODY", text: "تم تأكيد موعدك" }] };
      await submitTemplateRequest({ url: "https://graph.facebook.com/v23.0/123/message_templates", token: "test-only", payload,
        fetcher: async () => Response.json({ id: providerId, status: "PENDING", category: "UTILITY" }),
        persist: receipt => persistSubmittedTemplate({ database: db, businessId, connectionId: connection.id, payload, receipt }),
      });
      const saved = await db.whatsAppTemplate.findUniqueOrThrow({ where: { provider_providerTemplateId: { provider: "meta", providerTemplateId: providerId } } });
      expect(saved.status).toBe("pending");
      // An empty list during eventual consistency must not hide the confirmed receipt.
      const missing = await db.whatsAppTemplate.updateMany({ where: { businessId, connectionId: connection.id, NOT: recentSubmissionWhere(new Date()) }, data: { status: "disabled" } });
      expect(missing.count).toBe(0);
      await expect(persistSubmittedTemplate({ database: db, businessId: foreign.id, connectionId: connection.id, payload, receipt: { id: providerId, status: "APPROVED", category: "UTILITY" } })).rejects.toThrow("TENANT_COLLISION");
      expect((await db.whatsAppTemplate.findUniqueOrThrow({ where: { id: saved.id } })).status).toBe("pending");
      for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 960 }]) for (const theme of ["light", "dark"] as const) {
        const context = await authenticatedContext(browser, viewport, theme, seeded.sessionToken);
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        try {
          await page.goto(`${baseUrl}/dashboard/whatsapp/carts`, { waitUntil: "domcontentloaded" });
          await expect(page.getByRole("heading", { name: "السلال المتروكة والمتابعة" })).toBeVisible();
          await expect(page.locator("article")).toHaveCount(1);
          await expect(page.locator("article")).toContainText("cart-visible");
          await expect(page.locator("body")).not.toContainText("FOREIGN_CART_PRIVATE");
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
          if (theme === "dark") expect(await page.locator("article").evaluate(node => { const rgb = getComputedStyle(node.parentElement!.parentElement!).backgroundColor.match(/\d+/g)?.slice(0,3).map(Number); return rgb?.every(value => value > 220); })).toBe(false);
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-cart-report.png`, fullPage: true });
          await page.locator('select[name="state"]').selectOption("recovered");
          await page.getByRole("button", { name: "بحث", exact: true }).click();
          await expect(page.locator("article")).toHaveCount(0);
          console.info("commerce audit: cart filtering verified", viewport.name, theme);
          await page.goto(`${baseUrl}/dashboard/whatsapp/templates`, { waitUntil: "domcontentloaded" });
          await expect(page.getByRole("heading", { name: "إنشاء قالب أو تعديل قالب موجود", exact: true })).toBeVisible();
          console.info("commerce audit: template editor opened", viewport.name, theme);
          await expect(page.locator('#template-library article').filter({ hasText: "review_receipt_test" })).toContainText("قيد المراجعة");
          const editorForm = page.locator("form").filter({ has: page.locator('textarea[name="body"]') });
          await page.getByRole("button", { name: /^تأكيد الموعد/ }).click();
          await expect(page.locator('textarea[name="body"]')).toHaveValue(/رقم الحجز: \{\{7\}\}/);
          await expect(editorForm.locator('select[name="category"]')).toHaveValue("UTILITY");
          await page.getByRole("button", { name: /^تذكير بسلة متروكة/ }).click();
          await expect(editorForm.locator('select[name="category"]')).toHaveValue("MARKETING");
          await expect(page.locator('input[name="examples"]')).toHaveValue("");
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-template-starters.png`, fullPage: true });
          await page.getByRole("button", { name: /^رمز التحقق OTP/ }).click();
          await expect(page.locator('#template-studio select[name="category"]')).toHaveValue("AUTHENTICATION");
          await expect(page.getByLabel("صلاحية الرمز بالدقائق")).toHaveValue("10");
          await expect(page.locator('textarea[name="body"]')).toHaveCount(0);
          await expect(page.getByText("نسخ الرمز", { exact: true })).toBeVisible();
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-template-otp.png`, fullPage: true });
          await page.getByRole("button", { name: "إنشاء قالب مخصص", exact: true }).click();
          await expect(page.locator('textarea[name="body"]')).toHaveValue("");
          // Invalid forms must be stopped in the client, with the draft preserved.
          let templateRequests = 0;
          const countTemplatePosts = (request: import("@playwright/test").Request) => { if (request.method() === "POST") templateRequests++; };
          page.on("request", countTemplatePosts);
          await page.locator('input[name="name"]').fill("validation_test");
          await page.locator('textarea[name="body"]').fill("مرحبًا {{2}}");
          await page.getByRole("button", { name: "إرسال إلى Meta للمراجعة", exact: true }).click();
          await expect(editorForm).toContainText("متغيرات نص الرسالة غير صحيحة");
          await expect(page.locator('textarea[name="body"]')).toHaveValue("مرحبًا {{2}}");
          await expect(page.locator('textarea[name="body"]')).toBeFocused();
          await page.locator('textarea[name="body"]').fill("مرحبًا بعميلنا المميز");
          await page.locator('input[name="buttonText"]').fill("المتجر");
          await page.locator('input[name="buttonUrl"]').fill("http://ir.sa");
          await page.getByRole("button", { name: "إرسال إلى Meta للمراجعة", exact: true }).click();
          await expect(editorForm).toContainText("رابط الزر غير صالح");
          await expect(editorForm).not.toContainText("متغيرات نص الرسالة غير صحيحة");
          await expect(page.locator('input[name="buttonUrl"]')).toBeFocused();
          await expect(editorForm).toContainText("لا تحتاج أمثلة إذا كانت رسالتك بدون متغيرات");
          expect(templateRequests).toBe(0);
          page.off("request", countTemplatePosts);
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-template-validation.png`, fullPage: true });
          await page.getByLabel("ابحث عن نموذج جاهز").fill("تسليم الطلب");
          await expect(page.getByRole("button", { name: /^تسليم الطلب/ })).toBeVisible();
          await page.getByRole("button", { name: /^تسليم الطلب/ }).click();
          await expect(page.locator('textarea[name="body"]')).toHaveValue(/تم تسليم طلبك/);
          await page.getByLabel("ابحث عن نموذج جاهز").fill("");
          await page.locator('select[name="header"]').selectOption("VIDEO");
          const videoSample = Buffer.alloc(5 * 1024 * 1024);
          videoSample.write("ftyp", 4);
          await page.locator('input[name="sample"]').setInputFiles({ name: "sample-5mb.mp4", mimeType: "video/mp4", buffer: videoSample });
          expect(await page.locator('input[name="sample"]').evaluate(node => (node as HTMLInputElement).validity.valid)).toBe(true);
          await expect(page.locator('#template-studio video')).toBeVisible();
          await page.locator('input[name="sample"]').setInputFiles({ name: "oversize.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(17 * 1024 * 1024) });
          expect(await page.locator('input[name="sample"]').evaluate(node => (node as HTMLInputElement).validationMessage)).toContain("16 MB");
          await page.locator('select[name="header"]').selectOption("IMAGE");
          await page.locator('input[name="sample"]').setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
          await expect(page.getByAltText("عينة صورة القالب")).toBeVisible();
          await page.locator('input[name="footer"]').fill("فريق خدمة العملاء");
          await page.locator('input[name="buttonText"]').fill("تفاصيل الطلب");
          await expect(page.getByRole("complementary", { name: "معاينة رسالة واتساب" })).toContainText("فريق خدمة العملاء");
          await expect(page.getByRole("complementary", { name: "معاينة رسالة واتساب" })).toContainText("تفاصيل الطلب");
          await expect(page.locator('#template-studio form')).not.toContainText("\\n");
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-template-media.png`, fullPage: true });
          // No submit: this test must never contact Meta or send messages.
        } finally { await context.close(); }
      }
      await db.subscription.delete({ where: { id: subscription.id } });
      const context = await authenticatedContext(browser, { width: 390, height: 844 }, "light", seeded.sessionToken);
      try { const page = await context.newPage(); await page.goto(`${baseUrl}/dashboard/whatsapp/carts`); await expect(page).toHaveURL(/dashboard\/billing\/manage/); } finally { await context.close(); }
    } finally {
      await db.whatsAppAutomationCart.deleteMany({ where: { businessId: { in: [businessId, foreign.id] } } });
      await db.whatsAppContact.deleteMany({ where: { id: { in: [contact.id, otherContact.id] } } });
      await db.whatsAppTemplate.deleteMany({ where: { connectionId: connection.id } });
      await db.whatsAppConnection.delete({ where: { id: connection.id } });
      await db.subscription.deleteMany({ where: { id: subscription.id } });
      await db.business.delete({ where: { id: foreign.id } });
    }
  });
  test("Meta connection action remains readable and prominent in both themes and viewport sizes", async ({ browser }) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("visual fixture missing");
    const plan = await db.businessPlan.upsert({ where: { code: "BUSINESS" }, update: {}, create: { code: "BUSINESS", name: "Business", monthlyPrice: 99, productLimit: 10, isActive: true } });
    const subscription = await db.subscription.create({ data: { businessId: seeded.businessId, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 86_400_000), autoRenew: false } });
    try {
      for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 960 }]) for (const theme of ["light", "dark"] as const) {
        const context = await authenticatedContext(browser, viewport, theme, seeded.sessionToken);
        try {
          // Only the visual fixture loads a stub. Never authorize assets or send messages.
          await context.route("https://connect.facebook.net/en_US/sdk.js", route => route.fulfill({ contentType: "application/javascript", body: "window.FB={init(){},login(){}};" }));
          const page = await context.newPage();
          await page.goto(`${baseUrl}/dashboard/whatsapp/setup`, { waitUntil: "domcontentloaded" });
          const action = page.getByRole("button", { name: "ربط حساب Meta", exact: true });
          await expect(action).toBeEnabled();
          await page.evaluate(() => document.fonts.ready);
          const appearance = await action.evaluate(node => {
            const css = getComputedStyle(node);
            const luminance = (color: string) => {
              const channels = (color.match(/\d+/g) ?? []).slice(0, 3).map(Number).map(value => { const x = value / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
              return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
            };
            const a = luminance(css.color), b = luminance(css.backgroundColor);
            return { contrast: (Math.max(a,b) + .05) / (Math.min(a,b) + .05), weight: Number(css.fontWeight), size: parseFloat(css.fontSize), height: node.getBoundingClientRect().height, font: css.fontFamily };
          });
          expect(appearance.contrast).toBeGreaterThanOrEqual(4.5);
          expect(appearance.weight).toBeGreaterThanOrEqual(600);
          expect(appearance.size).toBeGreaterThanOrEqual(16);
          expect(appearance.height).toBeGreaterThanOrEqual(48);
          expect(appearance.font).toContain("Arabic");
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-meta-setup.png`, fullPage: true });
          await action.focus();
          expect(await action.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe("none");
        } finally { await context.close(); }
      }
    } finally { await db.subscription.delete({ where: { id: subscription.id } }); }
  });
  test("Salla journeys preview the selected sender template and save delayed drafts on mobile and desktop", async ({ browser }) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("visual fixture missing");
    const businessId = seeded.businessId;
    const suffix = crypto.randomUUID();
    const plan = await db.businessPlan.upsert({ where: { code: "BUSINESS" }, update: {}, create: { code: "BUSINESS", name: "Business", monthlyPrice: 99, productLimit: 10, isActive: true } });
    const subscription = await db.subscription.create({ data: { businessId, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 86_400_000), autoRenew: false } });
    const connection = await db.whatsAppConnection.create({ data: { businessId, status: "connected", wabaId: `visual-${suffix}`, phoneNumberId: `visual-${suffix}`, displayPhoneNumber: "+966500000101", verifiedName: "رقم مراجعة الطلبات", credentialEnvelope: { testSecret: "DO_NOT_RENDER_JOURNEY_SECRET" } } });
    const second = await db.whatsAppConnection.create({ data: { businessId, status: "connected", wabaId: `visual-${suffix}`, phoneNumberId: `second-${suffix}`, displayPhoneNumber: "+966500000102", marketingEnabled: false, bookingEnabled: true, credentialEnvelope: { testSecret: "DO_NOT_RENDER_JOURNEY_SECRET" } } });
    const template = await db.whatsAppTemplate.create({ data: { businessId, connectionId: connection.id, providerTemplateId: `visual-${suffix}`, name: "salla_shipped_review", language: "ar", category: "utility", status: "approved", providerStatus: "APPROVED", parameterFormat: "POSITIONAL", components: [{ type: "BODY", text: "مرحبًا {{1}}، شُحن طلبك {{3}} من {{2}}." }], rawPayload: {}, lastSyncedAt: new Date() } });
    try {
      for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 960 }]) for (const theme of ["light", "dark"] as const) {
        const context = await authenticatedContext(browser, viewport, theme, seeded.sessionToken);
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        try {
          await page.goto(`${baseUrl}/dashboard/whatsapp/automations`, { waitUntil: "domcontentloaded" });
          const studio = page.locator("#salla-journeys");
          await expect(studio).toBeVisible();
          await expect(studio.getByRole("group", { name: "سيناريوهات طلبات سلة" }).getByRole("button")).toHaveCount(11);
          await studio.getByRole("button", { name: "تم الشحن", exact: false }).click();
          await expect(studio.getByRole("button", { name: "إنشاء كمسودة", exact: true })).toBeDisabled();
          await expect(studio.getByLabel("رقم الإرسال لهذا السيناريو").locator(`option[value="${second.id}"]`)).toHaveCount(0);
          await studio.getByLabel("رقم الإرسال لهذا السيناريو").selectOption(connection.id);
          await studio.getByLabel("القالب المعتمد", { exact: true }).selectOption(template.id);
          await expect(studio.locator("aside")).toContainText("شُحن طلبك 1024");
          await studio.getByLabel("وقت الإرسال بعد تغيّر الحالة").selectOption("60");
          const name = `journey-${viewport.name}-${theme}-${suffix}`;
          await studio.getByLabel("اسم المسار", { exact: true }).fill(name);
          const submitStyle = await studio.getByRole("button", { name: "إنشاء كمسودة", exact: true }).evaluate(node => ({ background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color }));
          expect(submitStyle.background).not.toBe("rgb(255, 255, 255)");
          expect(submitStyle.background).not.toBe(submitStyle.color);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
          await expect(page.locator("body")).not.toContainText("DO_NOT_RENDER_JOURNEY_SECRET");
          if (theme === "dark") {
            expect(await studio.evaluate(node => { const rgb = getComputedStyle(node).backgroundColor.match(/\d+/g)?.slice(0, 3).map(Number); return rgb?.every(value => value > 220); })).toBe(false);
            expect(await studio.locator("header, aside, div").evaluateAll(nodes => nodes.filter(node => { const rect = node.getBoundingClientRect(); const rgb = getComputedStyle(node).backgroundColor.match(/\d+/g)?.slice(0, 3).map(Number); return rect.width >= 140 && rect.height >= 72 && rgb?.every(value => value > 220); }).length)).toBe(0);
          }
          await studio.screenshot({ path: `${outDir}/${viewport.name}-${theme}-salla-journeys.png` });
          await studio.getByRole("button", { name: "إنشاء كمسودة", exact: true }).click();
          await expect(page).toHaveURL(/create=complete/);
          const draft = await db.whatsAppAutomation.findFirstOrThrow({ where: { businessId, name } });
          expect(draft.status).toBe("draft");
          expect(draft.connectionId).toBe(connection.id);
          expect(draft.triggerType).toBe("salla_order_status");
          expect(draft.triggerConfig).toEqual({ version: 1, orderStatus: "shipped", delayMinutes: 60 });
          expect(await db.whatsAppAutomationJob.count({ where: { businessId, automationId: draft.id } })).toBe(0);
          await studio.getByRole("button", { name: "طلب مدفوع ومؤكد", exact: false }).click();
          await studio.getByLabel("رقم الإرسال لهذا السيناريو").selectOption(connection.id);
          await studio.getByLabel("القالب المعتمد", { exact: true }).selectOption(template.id);
          await studio.getByLabel("اسم المسار", { exact: true }).fill(`${name}-paid`);
          await studio.getByRole("button", { name: "إنشاء كمسودة", exact: true }).click();
          await expect.poll(() => db.whatsAppAutomation.count({ where: { businessId, name: `${name}-paid`, status: "draft", triggerType: "salla_order_confirmation" } })).toBe(1);
        } catch (error) {
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-salla-failed.png`, fullPage: true }).catch(() => {});
          await writeFile(`${outDir}/${viewport.name}-${theme}-salla-failed.txt`, `${page.url()}\n${await page.locator("body").innerText().catch(() => "page unavailable")}`, "utf8");
          throw error;
        } finally { await context.close(); }
      }
    } finally {
      await db.whatsAppAutomation.deleteMany({ where: { businessId, connectionId: { in: [connection.id, second.id] } } });
      await db.whatsAppTemplate.deleteMany({ where: { id: template.id } });
      await db.whatsAppConnection.deleteMany({ where: { id: { in: [connection.id, second.id] }, businessId } });
      await db.subscription.deleteMany({ where: { id: subscription.id } });
    }
  });
  test("25,000 contacts finish importing with outbound workers disabled", async ({ browser, request }) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("visual fixture missing");
    const businessId = seeded.businessId;
    const plan = await db.businessPlan.findUniqueOrThrow({ where: { code: "BUSINESS" } });
    const subscription = await db.subscription.create({ data: { businessId, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 86_400_000), autoRenew: false } });
    const context = await authenticatedContext(browser, { width: 390, height: 844 }, "dark", seeded.sessionToken);
    try {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/dashboard/whatsapp/contacts`);
      await expect(page.getByText(/دون حد عددي للجهات/)).toBeVisible();
      const buffer = Buffer.from(["phone", ...Array.from({ length: 25_000 }, (_, i) => `+9665${String(i).padStart(8, "0")}`)].join("\n"));
      await page.locator('input[name="file"]').setInputFiles({ name: "large-ci.csv", mimeType: "text/csv", buffer });
      await page.locator('#import-contacts button[type="submit"]').click();
      await expect(page).toHaveURL(/import=queued/, { timeout: 30_000 });
      const imported = await db.whatsAppContactImport.findFirstOrThrow({ where: { businessId, fileName: "large-ci.csv" } });
      expect(imported.totalRows).toBe(25_000);
      expect(imported.consentConfirmed).toBe(false);
      const batches = await db.whatsAppContactImportBatch.findMany({ where: { importId: imported.id, businessId } });
      expect(batches).toHaveLength(50);
      expect(batches.reduce((n, batch) => n + (Array.isArray(batch.rows) ? batch.rows.length : 0), 0)).toBe(25_000);
      expect((await request.get(`${baseUrl}/api/cron/contact-imports`)).status()).toBe(401);
      const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` };
      const results = await Promise.all([1, 2].map(() => request.get(`${baseUrl}/api/cron/contact-imports`, { headers, timeout: 120_000 })));
      for (const result of results) expect(result.status()).toBe(200);
      const finished = await db.whatsAppContactImport.findUniqueOrThrow({ where: { id: imported.id } });
      expect(finished.status).toBe("completed");
      expect(finished.importedRows).toBe(25_000);
      expect(await db.whatsAppContact.count({ where: { businessId } })).toBe(25_000);
      expect(await db.whatsAppConsent.count({ where: { businessId } })).toBe(0);
      expect(await db.whatsAppDeliveryJob.count({ where: { businessId } })).toBe(0);
      const repeated = await request.get(`${baseUrl}/api/cron/contact-imports`, { headers });
      expect((await repeated.json()).completedBatches).toBe(0);
      await page.reload();
      await page.screenshot({ path: `${outDir}/mobile-dark-large-import.png`, fullPage: true });
      await page.getByRole("radio", { name: "نسخ ولصق الأرقام", exact: true }).check();
      await page.locator('textarea[name="pastedPhones"]').fill("966599999998\n+966599999998\n966500000000\ninvalid");
      await expect(page.locator('input[name="file"]')).toHaveCount(0);
      await page.locator("#import-contacts").screenshot({ path: `${outDir}/mobile-dark-paste-import.png` });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator("#import-contacts").screenshot({ path: `${outDir}/desktop-dark-paste-import.png` });
      await page.locator('#import-contacts button[type="submit"]').click();
      await expect.poll(() => db.whatsAppContactImport.count({ where: { businessId, fileName: "أرقام بالنسخ واللصق.csv" } })).toBe(1);
      const pasted = await db.whatsAppContactImport.findFirstOrThrow({ where: { businessId, fileName: "أرقام بالنسخ واللصق.csv" } });
      expect(pasted.totalRows).toBe(4);
      expect(pasted.duplicateRows).toBe(1);
      expect(pasted.rejectedRows).toBe(1);
      expect(pasted.consentConfirmed).toBe(false);
      expect((await request.get(`${baseUrl}/api/cron/contact-imports`, { headers })).status()).toBe(200);
      const pastedFinished = await db.whatsAppContactImport.findUniqueOrThrow({ where: { id: pasted.id } });
      expect(pastedFinished.importedRows).toBe(1);
      expect(pastedFinished.duplicateRows).toBe(2);
      expect(await db.whatsAppContact.count({ where: { businessId, phoneE164: "+966599999998" } })).toBe(1);
      expect(await db.whatsAppConsent.count({ where: { businessId } })).toBe(0);
      expect(await db.whatsAppDeliveryJob.count({ where: { businessId } })).toBe(0);
    } finally {
      await context.close();
      await db.whatsAppContactImportBatch.deleteMany({ where: { businessId } });
      await db.whatsAppContactImport.deleteMany({ where: { businessId } });
      await db.whatsAppContact.deleteMany({ where: { businessId } });
      await db.subscription.deleteMany({ where: { id: subscription.id } });
    }
  });
  test("short links isolate tenants, redirect atomically and remain usable on mobile", async ({ browser, request }) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("visual fixture missing");
    const businessId = seeded.businessId;
    const plan = await db.businessPlan.findUniqueOrThrow({ where: { code: "BUSINESS" } });
    const subscription = await db.subscription.create({ data: { businessId, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 86400000), autoRenew: false } });
    const foreign = await db.business.create({ data: { ownerId: seeded.adminUserId, planId: plan.id, name: "رابط منشأة أخرى", businessType: "خدمات", slug: `foreign-link-${crypto.randomUUID()}` } });
    const otherLink = await db.businessShortLink.create({ data: { businessId: foreign.id, code: crypto.randomUUID().replaceAll("-", "").slice(0, 12), title: "FOREIGN_LINK_DO_NOT_SHOW", destination: "https://example.com/foreign" } });
    const destination = "https://example.com/products/booking?utm_source=whatsapp&utm_campaign=summer#details";
    try {
      expect((await request.get(`${baseUrl}/api/dashboard/short-links/export`)).status()).toBe(403);
      for (const theme of ["light", "dark"] as const) {
        const context = await authenticatedContext(browser, theme === "light" ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, theme, seeded.sessionToken);
        try {
          const page = await context.newPage();
          await page.goto(`${baseUrl}/dashboard/whatsapp/links`);
          const form = page.getByRole("form", { name: "إنشاء رابط مختصر" });
          await form.locator('[name="title"]').fill(`رابط اختبار ${theme}`);
          await form.locator('[name="destination"]').fill(destination);
          await form.getByRole("button").click();
          await expect(page).toHaveURL(/result=created/);
          const link = await db.businessShortLink.findFirstOrThrow({ where: { businessId, title: `رابط اختبار ${theme}` } });
          expect(await page.locator("body").innerText()).not.toContain(otherLink.title);
          const path = `${baseUrl}/s/${link.code}`;
          const options = { maxRedirects: 0, headers: { "user-agent": "Mozilla/5.0 Safari/537.36" } };
          const clicks = await Promise.all(Array.from({ length: 5 }, () => request.get(path, options)));
          for (const click of clicks) { expect(click.status()).toBe(302); expect(click.headers().location).toBe(destination); }
          await request.head(path, options);
          await request.get(path, { maxRedirects: 0, headers: { "user-agent": "facebookexternalhit/1.1" } });
          expect((await db.businessShortLink.findUniqueOrThrow({ where: { id: link.id } })).clicks).toBe(5n);
          const card = page.getByRole("article", { name: `رابط رابط اختبار ${theme}`, exact: true });
          // Tampering with a submitted id cannot modify a different tenant.
          const toggle = card.locator('form').filter({ has: page.getByRole("button", { name: "تعطيل", exact: true }) });
          await toggle.locator('[name="id"]').evaluate((node, id) => { (node as HTMLInputElement).value = id; }, otherLink.id);
          await toggle.getByRole("button").click();
          await expect(page).toHaveURL(/result=unavailable/);
          expect((await db.businessShortLink.findUniqueOrThrow({ where: { id: otherLink.id } })).status).toBe("active");
          await card.getByRole("button", { name: "تعطيل", exact: true }).click();
          await expect(page).toHaveURL(/result=updated/);
          expect((await request.get(path, options)).status()).toBe(404);
          await card.getByRole("button", { name: "تفعيل", exact: true }).click();
          await expect(page).toHaveURL(/result=updated/);
          await card.getByText("تعديل الاسم أو الوجهة", { exact: true }).click();
          await card.locator('[name="destination"]').fill("https://example.com/new?utm_source=changed");
          await card.getByRole("button", { name: "حفظ التعديل", exact: true }).click();
          await expect.poll(async () => (await request.head(path, options)).headers().location).toBe("https://example.com/new?utm_source=changed");
          const csv = await context.request.get(`${baseUrl}/api/dashboard/short-links/export`);
          expect(csv.status()).toBe(200);
          expect(await csv.text()).toContain(`https://ir.sa/s/${link.code}`);
          expect(await csv.text()).not.toContain(otherLink.title);
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
          await page.screenshot({ path: `${outDir}/${theme}-short-links.png`, fullPage: true });
          page.once("dialog", dialog => dialog.accept());
          await card.getByRole("button", { name: "حذف", exact: true }).click();
          await expect(card).toHaveCount(0);
          expect((await request.get(path, options)).status()).toBe(404);
          await expect(db.businessShortLink.update({ where: { id: link.id }, data: { status: "active" } })).rejects.toThrow();
        } finally { await context.close(); }
      }
    } finally {
      await db.businessShortLink.deleteMany({ where: { businessId: { in: [businessId, foreign.id] } } });
      await db.business.delete({ where: { id: foreign.id } });
      await db.subscription.delete({ where: { id: subscription.id } });
    }
  });
  test("campaign retries and studio stay clear on mobile and desktop", async ({ browser, request }) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("visual fixture missing");
    const businessId = seeded.businessId;
    const suffix = crypto.randomUUID();
    const plan = await db.businessPlan.findUniqueOrThrow({ where: { code: "BUSINESS" } });
    const subscription = await db.subscription.create({ data: { businessId, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 86_400_000), autoRenew: false } });
    const connection = await db.whatsAppConnection.create({ data: { businessId, status: "connected", wabaId: `campaign-${suffix}`, phoneNumberId: `campaign-${suffix}`, verifiedName: "رقم اختبار الحملة", credentialEnvelope: { testOnly: true } } });
    const template = await db.whatsAppTemplate.create({ data: { businessId, connectionId: connection.id, providerTemplateId: `campaign-${suffix}`, name: "campaign_review", language: "ar", category: "marketing", status: "approved", providerStatus: "APPROVED", parameterFormat: "POSITIONAL", components: [{ type: "BODY", text: "مرحبًا {{1}}، اكتشف خدماتنا واحجز موعدك." }], rawPayload: {}, lastSyncedAt: new Date() } });
    const contact = await db.whatsAppContact.create({ data: { businessId, phoneE164: "+966500000761", source: "manual" } });
    const bookingContact = await db.whatsAppContact.create({ data: { businessId, phoneE164: "+966500000762", source: "api" } });
    await db.whatsAppConsent.create({ data: { businessId, phoneE164: bookingContact.phoneE164, source: "booking", evidence: "Booking confirmation only", consentedAt: new Date() } });
    await db.whatsAppConsent.create({ data: { businessId, phoneE164: contact.phoneE164, source: "manual", evidence: "Isolated CI fixture only", consentedAt: new Date() } });
    const campaign = await db.whatsAppCampaign.create({ data: { businessId, connectionId: connection.id, templateId: template.id, name: "حملة اختبار إعادة المحاولة", status: "completed", totalRecipients: 1, audienceDefinition: { kind: "all_contacts" }, snapshotAt: new Date(), templateSnapshot: { name: template.name, language: "ar", category: "marketing" } } });
    const recipient = await db.whatsAppCampaignRecipient.create({ data: { businessId, campaignId: campaign.id, contactId: contact.id, phoneE164: contact.phoneE164, status: "sent" } });
    const job = await db.whatsAppDeliveryJob.create({ data: { businessId, campaignId: campaign.id, connectionId: connection.id, recipientId: recipient.id, idempotencyKey: suffix, status: "sent", attemptCount: 1, providerMessageId: `test-${suffix}` } });
    const foreignBusiness = await db.business.create({ data: { ownerId: seeded.adminUserId, planId: plan.id, name: "حملة منشأة أخرى سرية", slug: `foreign-report-${suffix}`, businessType: "خدمات", shortDescription: "اختبار عزل", description: "اختبار عزل", phone: "0555000099", whatsapp: "966555000099", city: "الرياض", district: "العليا" } });
    const foreignConnection = await db.whatsAppConnection.create({ data: { businessId: foreignBusiness.id, status: "connected", wabaId: `foreign-${suffix}`, phoneNumberId: `foreign-${suffix}`, credentialEnvelope: { testOnly: true } } });
    const foreignTemplate = await db.whatsAppTemplate.create({ data: { businessId: foreignBusiness.id, connectionId: foreignConnection.id, providerTemplateId: `foreign-${suffix}`, name: "foreign_report", language: "ar", category: "marketing", status: "approved", providerStatus: "APPROVED", components: [], rawPayload: {}, lastSyncedAt: new Date() } });
    const foreignCampaign = await db.whatsAppCampaign.create({ data: { businessId: foreignBusiness.id, connectionId: foreignConnection.id, templateId: foreignTemplate.id, name: "DO_NOT_LEAK_FOREIGN_CAMPAIGN", status: "completed", totalRecipients: 99, audienceDefinition: {}, snapshotAt: new Date(), templateSnapshot: { components: [] } } });

    try {
      const input = { businessId, campaignId: campaign.id, jobId: job.id, providerMessageId: `test-${suffix}`, errorCode: "131016", now: new Date() };
      await Promise.all([1, 2].map(() => db.$transaction(tx => retryCampaignFailureReceipt(tx, input))));
      const retried = await db.whatsAppDeliveryJob.findUniqueOrThrow({ where: { id: job.id } });
      expect(retried.status).toBe("retry_scheduled");
      expect(retried.attemptCount).toBe(1);
      expect((await db.whatsAppCampaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe("running");
      for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 960 }]) for (const theme of ["light", "dark"] as const) {
        const context = await authenticatedContext(browser, viewport, theme, seeded.sessionToken);
        try {
          const page = await context.newPage();
          await page.goto(`${baseUrl}/dashboard/whatsapp/campaigns`, { waitUntil: "domcontentloaded" });
          page.setDefaultTimeout(15_000);
          await expect(page.getByTestId("campaign-card").first().getByRole("status")).toContainText("إعادة محاولة مجدولة");
          await expect(page.getByRole("form", { name: "إنشاء حملة واتساب", exact: true })).not.toBeVisible();
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-campaign-overview.png`, fullPage: true });
          // Isolated receipt failure: processing completion must not look like delivery.
          await db.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: "completed" } });
          await db.whatsAppCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "failed" } });
          await db.whatsAppDeliveryJob.update({ where: { id: job.id }, data: { status: "failed", lastErrorCode: "131042" } });
          await page.reload({ waitUntil: "domcontentloaded" });
          const failedCard = page.locator(`#campaign-${campaign.id}`);
          await expect(failedCard.getByText("لم تصل الرسائل", { exact: true })).toBeVisible();
          await expect(failedCard.getByRole("status")).toContainText("أهلية الدفع");
          await expect(failedCard.getByRole("status")).toContainText("131042");
          const failureContrast = await failedCard.getByRole("status").locator("p, b").evaluateAll(nodes => nodes.map(node => {
            const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "white"; ctx.fillRect(0, 0, 1, 1);
            const ancestors: Element[] = [];
            for (let parent: Element | null = node; parent; parent = parent.parentElement) ancestors.unshift(parent);
            for (const parent of ancestors) { ctx.fillStyle = getComputedStyle(parent).backgroundColor; ctx.fillRect(0, 0, 1, 1); }
            const background = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
            ctx.fillStyle = getComputedStyle(node).color; ctx.fillRect(0, 0, 1, 1);
            const foreground = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
            const luminance = (rgb: number[]) => rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
            const a = luminance(background), b = luminance(foreground);
            return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
          }));
          expect(Math.min(...failureContrast)).toBeGreaterThanOrEqual(4.5);

          expect(await failedCard.locator("details").evaluate(node => (node as HTMLDetailsElement).open)).toBe(false);
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
          await failedCard.screenshot({ path: `${outDir}/${viewport.name}-${theme}-campaign-payment-failure.png` });
          await page.goto(`${baseUrl}/dashboard/whatsapp/campaigns/${campaign.id}`, { waitUntil: "domcontentloaded" });
          await expect(page.getByRole("heading", { name: "حالة كل مستلم" })).toBeVisible();
          await expect(page.getByRole("heading", { name: "توزيع نتائج الحملة" })).toBeVisible();
          await expect(page.getByRole("heading", { name: "إيقاع الحملة خلال 24 ساعة" })).toBeVisible();
          await expect(page.getByText("رمز Meta: 131042", { exact: true })).toBeVisible();
          await expect(page.getByText("+966500000761", { exact: true })).toBeVisible();
          await expect(page.getByText("+966500000762", { exact: true })).not.toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-campaign-live-report.png`, fullPage: true });
          await page.getByLabel("حالة المستلم", { exact: true }).selectOption("read");
          await page.getByRole("button", { name: "بحث", exact: true }).click();
          await expect(page.getByText("لا يوجد مستلمون يطابقون البحث.")).toBeVisible();
          if (viewport.name === "mobile" && theme === "light") {
            // A real durable receipt must change the filtered report without reload.
            const receiptAt = new Date();
            await db.whatsAppCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "read", sentAt: receiptAt, deliveredAt: receiptAt, readAt: receiptAt, failedAt: null } });
            await expect(page.getByText("+966500000761", { exact: true })).toBeVisible({ timeout: 20_000 });
            await expect(page.getByRole("img", { name: "توزيع الحالات؛ الأعداد مفصلة في القائمة" })).toBeVisible();
            await expect(page.getByRole("heading", { name: "ما الذي يحتاج إلى إجراء؟", exact: true })).not.toBeVisible();
          }
          const foreignReport = await page.goto(`${baseUrl}/dashboard/whatsapp/campaigns/${foreignCampaign.id}`);
          expect([200, 404]).toContain(foreignReport?.status());
          await expect(page.getByRole("heading", { name: "الصفحة غير موجودة", exact: true })).toBeVisible();
          expect(await foreignReport!.text()).not.toContain("DO_NOT_LEAK_FOREIGN_CAMPAIGN");
          await expect(page.getByText("DO_NOT_LEAK_FOREIGN_CAMPAIGN")).not.toBeVisible();
          const missingReport = await page.goto(`${baseUrl}/dashboard/whatsapp/campaigns/${crypto.randomUUID()}`);
          expect([200, 404]).toContain(missingReport?.status());
          await expect(page.getByRole("heading", { name: "الصفحة غير موجودة", exact: true })).toBeVisible();
          await db.whatsAppCampaignRecipient.update({ where: { id: recipient.id }, data: { sentAt: null, deliveredAt: null, readAt: null, failedAt: null } });
          await page.goto(`${baseUrl}/dashboard/whatsapp/campaigns`, { waitUntil: "domcontentloaded" });

          await db.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: "running" } });
          await db.whatsAppCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "queued" } });
          await db.whatsAppDeliveryJob.update({ where: { id: job.id }, data: { status: "retry_scheduled", lastErrorCode: "131016" } });
          await page.reload({ waitUntil: "domcontentloaded" });

          if (viewport.name === "mobile" && theme === "light") {
            await db.whatsAppCampaign.update({ where: { id: campaign.id }, data: { name: "حملة محدثة تلقائيًا" } });
            await expect(page.getByText("حملة محدثة تلقائيًا", { exact: true })).toBeVisible({ timeout: 25_000 });
          }
          await page.getByRole("button", { name: "إيقاف التحديث التلقائي", exact: true }).click();
          await expect(page.getByRole("button", { name: "تشغيل التحديث التلقائي", exact: true })).toHaveAttribute("aria-pressed", "false");
          await page.locator("#new-campaign > summary").click();
          await page.getByLabel("اسم الحملة", { exact: true }).fill("حملة مراجعة");
          await page.getByRole("button", { name: "التالي", exact: true }).click();
          await expect(page.getByRole("link", { name: /إضافة جمهور من Excel/ })).toBeVisible();
          await page.getByRole("button", { name: /أرقام محددة يدويًا/ }).click();
          await page.getByLabel("أرقام المستلمين المحددين").fill(`${contact.phoneE164}\n${contact.phoneE164}\n${bookingContact.phoneE164}\ninvalid`);
          await expect(page.getByRole("button", { name: "التالي", exact: true })).toBeDisabled();
          await page.getByRole("button", { name: "فحص الأرقام المحددة", exact: true }).click();
          await expect(page.getByText("ستُنشأ الحملة للمؤهلين فقط (1).", { exact: false })).toBeVisible();
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-manual-audience.png`, fullPage: true });
          await page.getByRole("button", { name: "التالي", exact: true }).click();
          await expect(page.getByRole("heading", { name: "اختر الرسالة", exact: true })).toBeVisible();
          await page.getByLabel("قالب الرسالة", { exact: true }).selectOption(template.id);
          await page.getByLabel("مصدر body:1", { exact: true }).selectOption("literal");
          await page.getByLabel("قيمة body:1", { exact: true }).fill("عميلنا المميز");
          // The real API must scope its store list and reject unowned stores before decrypting credentials.
          const storeList = await context.request.get(`${baseUrl}/api/commerce/salla/products`);
          expect(storeList.status()).toBe(200);
          const ownStores = (await storeList.json()).stores;
          expect(ownStores.length).toBeGreaterThan(0);
          expect(JSON.stringify(ownStores)).not.toContain("DO_NOT_RENDER_COMMERCE_SECRET");
          const foreignBusiness = await db.business.create({ data: { ownerId: seeded.adminUserId, name: "Foreign catalog", slug: `foreign-catalog-${crypto.randomUUID()}`, businessType: "test" } });
          const foreignStore = await db.whatsAppCommerceIntegration.create({ data: { businessId: foreignBusiness.id, provider: "salla", externalStoreId: crypto.randomUUID(), status: "active", connectedAt: new Date(), displayName: "PRIVATE_FOREIGN_STORE", credentialEnvelope: { testSecret: "DO_NOT_DECRYPT" } } });
          try {
            expect(JSON.stringify(ownStores)).not.toContain(foreignStore.id);
            expect((await context.request.get(`${baseUrl}/api/commerce/salla/products?store=${foreignStore.id}`)).status()).toBe(404);
          } finally {
            await db.whatsAppCommerceIntegration.delete({ where: { id: foreignStore.id } });
            await db.business.delete({ where: { id: foreignBusiness.id } });
          }
          expect((await request.get(`${baseUrl}/api/commerce/salla/products`)).status()).toBe(403);
          // Product responses are isolated fixtures: no Salla API or WhatsApp request occurs.
          await page.route("**/api/commerce/salla/products?*", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [{ id: "123", name: "رحلة بحرية خاصة", price: "115.00 SAR", url: "https://store.example.com/p123" }], page: 1, hasMore: false }) }));
          await page.getByRole("button", { name: "استعراض منتجات سلة", exact: true }).click();
          const picker = page.getByLabel("منتجات سلة للحملة", { exact: true });
          await picker.getByRole("button", { name: "عرض المنتجات", exact: true }).click();
          await picker.getByLabel("منتج سلة للحملة", { exact: true }).selectOption("123");
          await picker.getByRole("button", { name: "إدراج اسم المنتج", exact: true }).click();
          await expect(page.getByLabel("قيمة body:1", { exact: true })).toHaveValue("رحلة بحرية خاصة");
          await picker.getByRole("button", { name: "إدراج السعر", exact: true }).click();
          await expect(page.getByLabel("قيمة body:1", { exact: true })).toHaveValue("115.00 SAR");
          await picker.getByRole("button", { name: "إدراج رابط المنتج", exact: true }).click();
          await expect(page.getByLabel("قيمة body:1", { exact: true })).toHaveValue("https://store.example.com/p123");
          await expect(page.getByLabel("قيمة body:1", { exact: true })).toHaveValue(/^https:\/\/ir\.sa\/s\/[A-Za-z0-9_-]{12}$/, { timeout: 15000 });
          const automatic = await db.businessShortLink.findFirstOrThrow({ where: { businessId, destination: "https://store.example.com/p123", status: "active" } });
          await expect(page.getByLabel("قيمة body:1", { exact: true })).toHaveValue(`https://ir.sa/s/${automatic.code}`);
          await picker.screenshot({ path: `${outDir}/${viewport.name}-${theme}-salla-product-picker.png` });
          await page.unroute("**/api/commerce/salla/products?*");
          await page.getByLabel("قيمة body:1", { exact: true }).fill("عميلنا المميز");
          await expect(page.getByText("معاينة الرسالة", { exact: true })).toBeVisible();
          if (theme === "dark") {
            const studio = page.getByRole("form", { name: "إنشاء حملة واتساب", exact: true });
            expect(await studio.locator("div, article, aside").evaluateAll(nodes => nodes.filter(node => {
              const rect = node.getBoundingClientRect();
              const color = getComputedStyle(node).backgroundColor.match(/\d+/g)?.slice(0, 3).map(Number);
              return rect.width >= 140 && rect.height >= 50 && color?.every(value => value > 220);
            }).length)).toBe(0);
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-campaign-studio.png`, fullPage: true });
          if (viewport.name === "mobile" && theme === "light") {
            await page.getByRole("form", { name: "إنشاء حملة واتساب", exact: true }).getByRole("button", { name: "التالي", exact: true }).last().click();
            await page.getByRole("button", { name: "التالي", exact: true }).click();
            await page.getByRole("button", { name: "إنشاء وتثبيت الجمهور", exact: true }).click();
            await expect(page).toHaveURL(/create=complete/);
            const created = await db.whatsAppCampaign.findFirstOrThrow({ where: { businessId, name: "حملة مراجعة" }, include: { recipients: true } });
            expect(created.recipients.map(item => item.phoneE164)).toEqual([contact.phoneE164]);
            expect(created.recipients[0].templateParameters).toEqual([{ type: "body", parameters: [{ type: "text", text: "عميلنا المميز" }] }]);
            const report = await context.request.get(`${baseUrl}/api/dashboard/whatsapp/campaign-export?campaign=${created.id}`);
            expect(report.status()).toBe(200);
            expect(await report.text()).toContain(contact.phoneE164);
            await db.whatsAppCampaignRecipient.deleteMany({ where: { campaignId: created.id } });
            await db.whatsAppCampaign.delete({ where: { id: created.id } });
          }
        } catch (error) {
          const page = context.pages()[0];
          if (page) {
            await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-campaign-failed.png`, fullPage: true }).catch(() => {});
            await writeFile(`${outDir}/${viewport.name}-${theme}-campaign-failed.txt`, `${String(error)}\n${page.url()}\n${await page.locator("body").innerText().catch(() => "page unavailable")}`, "utf8");
          }
          throw error;
        } finally { await context.close(); }
      }
      expect(await db.whatsAppMessage.count({ where: { businessId, direction: "outbound" } })).toBe(0);
      // A signed receipt must update durable state without running the cron worker.
      const conversation = await db.whatsAppConversation.create({ data: { businessId, phoneNumberId: connection.phoneNumberId!, customerPhoneE164: contact.phoneE164 } });
      await db.whatsAppMessage.create({ data: { businessId, conversationId: conversation.id, provider: "meta", providerMessageId: `test-${suffix}`, direction: "outbound", messageType: "template", status: "sent", payload: {} } });
      const payload = JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: connection.wabaId, changes: [{ field: "messages", value: { metadata: { phone_number_id: connection.phoneNumberId }, statuses: [{ id: `test-${suffix}`, status: "read", timestamp: String(Math.floor(Date.now() / 1000)), recipient_id: contact.phoneE164.replace("+", "") }] } }] }] });
      const signature = "sha256=" + createHmac("sha256", process.env.META_APP_SECRET!).update(payload).digest("hex");
      const rejected = await request.post(`${baseUrl}/api/whatsapp/meta/webhook`, { data: payload, headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=invalid" } });
      expect(rejected.status()).toBe(401);
      const receipt = await request.post(`${baseUrl}/api/whatsapp/meta/webhook`, { data: payload, headers: { "content-type": "application/json", "x-hub-signature-256": signature } });
      expect(receipt.status()).toBe(202);
      await expect.poll(async () => (await db.whatsAppCampaignRecipient.findUniqueOrThrow({ where: { id: recipient.id } })).status, { timeout: 15_000 }).toBe("read");
      const duplicate = await request.post(`${baseUrl}/api/whatsapp/meta/webhook`, { data: payload, headers: { "content-type": "application/json", "x-hub-signature-256": signature } });
      expect(duplicate.status()).toBe(202);
      expect(await db.whatsAppWebhookEvent.count({ where: { businessId, phoneNumberId: connection.phoneNumberId } })).toBe(1);
    } finally {
      await db.whatsAppWebhookEvent.deleteMany({ where: { businessId, phoneNumberId: connection.phoneNumberId } });
      await db.whatsAppMessage.deleteMany({ where: { businessId, providerMessageId: `test-${suffix}` } });
      await db.whatsAppConversation.deleteMany({ where: { businessId, phoneNumberId: connection.phoneNumberId! } });
      await db.whatsAppDeliveryJob.deleteMany({ where: { campaignId: campaign.id } });
      await db.whatsAppCampaignRecipient.deleteMany({ where: { campaignId: campaign.id } });
      await db.whatsAppCampaign.delete({ where: { id: campaign.id } });
      await db.whatsAppCampaign.delete({ where: { id: foreignCampaign.id } });
      await db.whatsAppTemplate.delete({ where: { id: foreignTemplate.id } });
      await db.whatsAppConnection.delete({ where: { id: foreignConnection.id } });
      await db.business.delete({ where: { id: foreignBusiness.id } });
      await db.whatsAppConsent.deleteMany({ where: { businessId, phoneE164: contact.phoneE164 } });
      await db.whatsAppContact.delete({ where: { id: contact.id } });
      await db.whatsAppConsent.deleteMany({ where: { businessId, phoneE164: bookingContact.phoneE164 } });
      await db.whatsAppContact.delete({ where: { id: bookingContact.id } });
      await db.whatsAppTemplate.delete({ where: { id: template.id } });
      await db.whatsAppConnection.delete({ where: { id: connection.id } });
      await db.subscription.delete({ where: { id: subscription.id } });
    }
  });
  test("live campaign report reconciles mixed receipts and paginates recipients", async ({ browser }) => {
    test.setTimeout(120_000);
    if (!seeded) throw new Error("visual fixture missing");
    const businessId = seeded.businessId, suffix = crypto.randomUUID();
    const plan = await db.businessPlan.findUniqueOrThrow({ where: { code: "BUSINESS" } });
    const subscription = await db.subscription.create({ data: { businessId, planId: plan.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 86_400_000), autoRenew: false } });
    const connection = await db.whatsAppConnection.create({ data: { businessId, status: "connected", wabaId: `report-${suffix}`, phoneNumberId: `report-${suffix}`, verifiedName: "منشأة اختبار التحليلات", credentialEnvelope: { testOnly: true } } });
    const components = [{ type: "BODY", text: "مرحبًا بكم في INFRO. اكتشف خدماتنا واحجز موعدك." }];
    const template = await db.whatsAppTemplate.create({ data: { businessId, connectionId: connection.id, providerTemplateId: `report-${suffix}`, name: "report_test", language: "ar", category: "marketing", status: "approved", providerStatus: "APPROVED", components, rawPayload: {}, lastSyncedAt: new Date() } });
    const campaign = await db.whatsAppCampaign.create({ data: { businessId, connectionId: connection.id, templateId: template.id, name: "حملة متابعة النتائج المباشرة", status: "running", totalRecipients: 30, audienceDefinition: {}, snapshotAt: new Date(), templateSnapshot: { components } } });
    const contactIds: string[] = [];
    try {
      for (let index = 0; index < 30; index++) {
        const status = ["sent", "delivered", "read", "failed", "queued"][index % 5];
        const at = new Date(Date.now() - (index % 8) * 3600000);
        const contact = await db.whatsAppContact.create({ data: { businessId, displayName: `عميل اختبار ${index + 1}`, phoneE164: `+966500009${String(index).padStart(3, "0")}`, source: "manual" } });
        contactIds.push(contact.id);
        await db.whatsAppCampaignRecipient.create({ data: { businessId, campaignId: campaign.id, contactId: contact.id, phoneE164: contact.phoneE164, displayName: contact.displayName, status, sentAt: status !== "queued" ? at : null, deliveredAt: ["delivered", "read"].includes(status) ? at : null, readAt: status === "read" ? at : null, failedAt: status === "failed" ? at : null } });
      }
      for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 960 }]) for (const theme of ["light", "dark"] as const) {
        const context = await authenticatedContext(browser, viewport, theme, seeded.sessionToken);
        try {
          const page = await context.newPage();
          await page.goto(`${baseUrl}/dashboard/whatsapp/campaigns/${campaign.id}`, { waitUntil: "domcontentloaded" });
          const metrics = page.getByRole("region", { name: "نتائج التسليم الفعلية" });
          await expect(metrics.locator("article").filter({ hasText: "قبلتها Meta" }).locator("b")).toHaveText("٢٤");
          await expect(metrics.locator("article").filter({ hasText: "تم التسليم" }).locator("b")).toHaveText("١٢");
          await expect(metrics.locator("article").filter({ hasText: "تمت القراءة" }).locator("b")).toHaveText("٦");
          await expect(page.getByRole("table").last().locator("tbody tr")).toHaveCount(25);
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
          await page.screenshot({ path: `${outDir}/${viewport.name}-${theme}-campaign-live-mixed.png`, fullPage: true });
          await page.getByRole("link", { name: "التالي", exact: true }).click();
          await expect(page.getByRole("table").last().locator("tbody tr")).toHaveCount(5);
          await page.getByLabel("حالة المستلم", { exact: true }).selectOption("failed");
          await page.getByRole("button", { name: "بحث", exact: true }).click();
          await expect(page.getByRole("table").last().locator("tbody tr")).toHaveCount(6);
          await expect(page.getByRole("link", { name: "التالي", exact: true })).not.toBeVisible();
        } finally { await context.close(); }
      }
    } finally {
      await db.whatsAppCampaignRecipient.deleteMany({ where: { businessId, campaignId: campaign.id } });
      await db.whatsAppCampaign.delete({ where: { id: campaign.id } });
      await db.whatsAppContact.deleteMany({ where: { businessId, id: { in: contactIds } } });
      await db.whatsAppTemplate.delete({ where: { id: template.id } });
      await db.whatsAppConnection.delete({ where: { id: connection.id } });
      await db.subscription.delete({ where: { id: subscription.id } });
    }
  });
  test("WhatsApp customer context stays tenant-scoped and mobile back restores the list",async({browser})=>{
    test.setTimeout(180_000);
    if(!seeded)throw new Error("visual fixture missing");
    const businessId=seeded.businessId;
    const plan=await db.businessPlan.upsert({where:{code:"BUSINESS"},update:{},create:{code:"BUSINESS",name:"Business",monthlyPrice:99,productLimit:10,isActive:true}});
    const subscription=await db.subscription.create({data:{businessId,planId:plan.id,status:"active",provider:"internal",startsAt:new Date(Date.now()-60_000),endsAt:new Date(Date.now()+86_400_000),autoRenew:false}});
    const outsider=await db.business.create({data:{ownerId:seeded.adminUserId,name:"Other tenant",businessType:"خدمات",slug:`other-inbox-${crypto.randomUUID()}`}});
    const viewer=await db.user.create({data:{name:"Inbox viewer",email:`viewer-${crypto.randomUUID()}@hee.test`,passwordHash:"test-only",emailVerifiedAt:new Date()}});
    const viewerToken=crypto.randomUUID();
    await db.session.create({data:{userId:viewer.id,token:viewerToken,expiresAt:new Date(Date.now()+3_600_000)}});
    await db.businessMember.create({data:{businessId,userId:viewer.id,role:"viewer",status:"active"}});
    const phone="+966500000721";
    try{
      const optedOutAt=new Date("2026-01-01T00:00:00.000Z");
      const contact=await db.whatsAppContact.create({data:{businessId,phoneE164:phone,displayName:"عميل مراجعة المحادثات",source:"inbound",optedOutAt}});
      const tag=await db.whatsAppContactTag.create({data:{businessId,name:"متابعة خدمة",normalizedName:"متابعة خدمة"}});
      await db.whatsAppContactTagMembership.create({data:{businessId,contactId:contact.id,tagId:tag.id}});
      const foreignContact=await db.whatsAppContact.create({data:{businessId:outsider.id,phoneE164:phone,displayName:"PRIVATE_OTHER_TENANT",source:"inbound"}});
      const foreignTag=await db.whatsAppContactTag.create({data:{businessId:outsider.id,name:"PRIVATE_OTHER_TAG",normalizedName:"private_other_tag"}});
      await db.whatsAppContactTagMembership.create({data:{businessId:outsider.id,contactId:foreignContact.id,tagId:foreignTag.id}});
      const selected=await db.whatsAppConversation.create({data:{businessId,phoneNumberId:"inbox-primary",customerPhoneE164:phone,customerDisplayName:"عميل مراجعة المحادثات",lastInboundAt:new Date(),lastMessageAt:new Date(),assignedToUserId:seeded.userId,assignedAt:new Date(),priority:"urgent",slaDueAt:new Date(Date.now()+15*60_000)}});
      const related=await db.whatsAppConversation.create({data:{businessId,phoneNumberId:"inbox-secondary",customerPhoneE164:phone,lastMessageAt:new Date(Date.now()-3_600_000)}});
      const foreign=await db.whatsAppConversation.create({data:{businessId:outsider.id,phoneNumberId:"inbox-foreign",customerPhoneE164:phone,customerDisplayName:"PRIVATE_OTHER_TENANT",lastMessageAt:new Date()}});
      await db.whatsAppMessage.create({data:{businessId,conversationId:selected.id,providerMessageId:`visual-${crypto.randomUUID()}`,direction:"inbound",messageType:"text",status:"received",textBody:"أرغب بمتابعة الخدمة"}});
      let tagActionRequest: { body: string; headers: Record<string,string> } | null = null;
      for(const viewport of [{name:"mobile",width:390,height:844},{name:"desktop",width:1440,height:960}])for(const theme of ["light","dark"] as const){
        const context=await authenticatedContext(browser,viewport,theme,seeded.sessionToken);
        try{
          const page=await context.newPage();
          await page.goto(`${baseUrl}/dashboard/whatsapp/inbox`,{waitUntil:"domcontentloaded"});
          const conversation=page.locator(`a[href="/dashboard/whatsapp/inbox?conversation=${selected.id}"]`);
          await expect(conversation).toBeVisible();
          await conversation.click();
          await expect(page.getByRole("region",{name:"إدارة خدمة المحادثة"})).toContainText("عاجلة");
          await expect(page.getByRole("region",{name:"إدارة خدمة المحادثة"})).toContainText("مالك المنشأة");
          await expect(page.getByRole("button",{name:"حفظ المتابعة",exact:true})).toBeVisible();
          await page.getByText("سجل العميل والوسوم",{exact:true}).click();
          await expect(page.getByRole("list",{name:"وسوم العميل"})).toContainText("متابعة خدمة");
          await page.getByLabel("اسم الوسم",{exact:true}).fill("متابعة جديدة");
          const tagRequest=page.waitForRequest(request=>request.method()==="POST"&&request.url().includes("/dashboard/whatsapp/inbox"));
          await page.getByRole("button",{name:"إضافة الوسم",exact:true}).click();
          const submittedTagRequest=await tagRequest;
          const actionHeaders=submittedTagRequest.headers();
          tagActionRequest={body:submittedTagRequest.postData()!,headers:{"content-type":actionHeaders["content-type"],...(actionHeaders["next-action"]?{"next-action":actionHeaders["next-action"]}:{}),origin:baseUrl}};
          await expect(page.getByRole("status")).toContainText("تمت إضافة الوسم");
          await expect(page.getByRole("list",{name:"وسوم العميل"})).toContainText("متابعة جديدة");
          await page.getByLabel("اسم الوسم",{exact:true}).fill("متابعة جديدة");
          await page.getByRole("button",{name:"إضافة الوسم",exact:true}).click();
          await expect(page.getByRole("button",{name:"إزالة وسم متابعة جديدة",exact:true})).toHaveCount(1);
          expect(await db.whatsAppContactTagMembership.count({where:{businessId,contactId:contact.id,tag:{normalizedName:"متابعة جديدة"}}})).toBe(1);
          await page.getByRole("button",{name:"إزالة وسم متابعة جديدة",exact:true}).click();
          await expect(page.getByRole("status")).toContainText("تمت إزالة الوسم");
          await expect(page.getByRole("list",{name:"وسوم العميل"})).not.toContainText("متابعة جديدة");
          expect(await db.whatsAppContactTagMembership.count({where:{businessId:outsider.id,contactId:foreignContact.id}})).toBe(1);
          expect(await db.whatsAppConsent.count({where:{businessId,phoneE164:phone}})).toBe(0);
          expect((await db.whatsAppContact.findUniqueOrThrow({where:{id:contact.id}})).optedOutAt?.toISOString()).toBe(optedOutAt.toISOString());
          await expect(page.getByRole("region",{name:"محادثات العميل الأخرى"}).locator(`a[href$="${related.id}"]`)).toBeVisible();
          await expect(page.getByRole("button",{name:"إرسال الرد",exact:true})).toBeVisible();
          await expect(page.locator("body")).not.toContainText(/PRIVATE_OTHER_TENANT|PRIVATE_OTHER_TAG/);
          expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
          if(theme==="dark"){
            const lightIslands=await page.locator("details section").evaluateAll(nodes=>nodes.filter(node=>{const rgb=getComputedStyle(node).backgroundColor.match(/\d+/g)?.slice(0,3).map(Number);return rgb?.every(value=>value>220)}).length);
            expect(lightIslands).toBe(0);
          }
          await page.screenshot({path:`${outDir}/${viewport.name}-${theme}-whatsapp-customer-context.png`,fullPage:true});
          // A forged hidden conversation ID must not mutate another tenant.
          const tagForm=page.getByRole("button",{name:"إضافة الوسم",exact:true}).locator("..");
          await tagForm.locator('input[name="conversationId"]').evaluate((node,id)=>{(node as HTMLInputElement).value=id;},foreign.id);
          await page.getByLabel("اسم الوسم",{exact:true}).fill("forged-tag");
          await page.getByRole("button",{name:"إضافة الوسم",exact:true}).click();
          await expect(page).toHaveURL(/tags=unavailable/);
          expect(await db.whatsAppContactTag.count({where:{normalizedName:"forged-tag",businessId:{in:[businessId,outsider.id]}}})).toBe(0);
          await page.goto(`${baseUrl}/dashboard/whatsapp/inbox?conversation=${selected.id}`,{waitUntil:"domcontentloaded"});
          if(viewport.name==="mobile"){
            await page.getByRole("link",{name:"العودة إلى المحادثات",exact:true}).click();
            await expect(conversation).toBeVisible();
            await expect(page.getByRole("button",{name:"إرسال الرد",exact:true})).toHaveCount(0);
          }
          await page.goto(`${baseUrl}/dashboard/whatsapp/inbox?conversation=${foreign.id}`,{waitUntil:"domcontentloaded"});
          await expect(page.getByText("سجل العميل والوسوم",{exact:true})).toHaveCount(0);
          await expect(page.locator("body")).not.toContainText(/PRIVATE_OTHER_TENANT|PRIVATE_OTHER_TAG/);
        }finally{await context.close();}
      }
      const viewerContext=await authenticatedContext(browser,{width:390,height:844},"light",viewerToken);
      try{
        const page=await viewerContext.newPage();
        await page.goto(`${baseUrl}/dashboard/whatsapp/inbox?conversation=${selected.id}`,{waitUntil:"domcontentloaded"});
        await expect(page.getByText("صلاحيتك تتيح مشاهدة المحادثة فقط.",{exact:false})).toBeVisible();
        await expect(page.getByText("يحتاج التعديل إلى صلاحية إدارة صندوق المحادثات.",{exact:false})).toBeVisible();
        await expect(page.getByRole("button",{name:"حفظ المتابعة",exact:true})).toHaveCount(0);
        await expect(page.getByRole("button",{name:"إرسال الرد",exact:true})).toHaveCount(0);
        await page.getByText("سجل العميل والوسوم",{exact:true}).click();
        await expect(page.getByText("تعديل الوسوم يحتاج صلاحية إدارة صندوق المحادثات.",{exact:true})).toBeVisible();
        await expect(page.getByRole("button",{name:"إضافة الوسم",exact:true})).toHaveCount(0);
        await expect(page.getByRole("button",{name:/إزالة وسم/})).toHaveCount(0);
        if(!tagActionRequest)throw new Error("tag action request missing");
        const auditCount=await db.whatsAppAuditLog.count({where:{businessId,action:"inbox.tags.update"}});
        await viewerContext.request.post(`${baseUrl}/dashboard/whatsapp/inbox?conversation=${selected.id}`,{headers:tagActionRequest.headers,data:tagActionRequest.body});
        expect(await db.whatsAppContactTagMembership.count({where:{businessId,contactId:contact.id,tag:{normalizedName:"متابعة جديدة"}}})).toBe(0);
        expect(await db.whatsAppAuditLog.count({where:{businessId,action:"inbox.tags.update"}})).toBe(auditCount);
      }finally{await viewerContext.close();}
    }finally{
      for(const id of [businessId,outsider.id]){
        await db.whatsAppMessage.deleteMany({where:{businessId:id}});
        await db.whatsAppConversation.deleteMany({where:{businessId:id}});
        await db.whatsAppContactTagMembership.deleteMany({where:{businessId:id}});
        await db.whatsAppContactTag.deleteMany({where:{businessId:id}});
        await db.whatsAppContact.deleteMany({where:{businessId:id}});
      }
      await db.businessMember.deleteMany({where:{userId:viewer.id}});
      await db.session.deleteMany({where:{userId:viewer.id}});
      await db.user.delete({where:{id:viewer.id}});
      await db.business.delete({where:{id:outsider.id}});
      await db.subscription.delete({where:{id:subscription.id}});
    }
  });
  test("seven activity layouts preserve stored ordering, configurable actions and optional booking on three screen sizes",async({browser})=>{
    test.setTimeout(600_000);
    if(!seeded)throw new Error("visual fixture missing");
    const business=await db.business.findUniqueOrThrow({where:{id:seeded.businessId}});
    await db.subscription.create({data:{businessId:business.id,planId:business.planId!,status:"active",provider:"internal",startsAt:new Date(Date.now()-60_000),endsAt:new Date(Date.now()+86_400_000),autoRenew:false}});
    await db.workingHours.createMany({data:Array.from({length:7},(_,dayOfWeek)=>({businessId:business.id,dayOfWeek,opensAt:"08:00",closesAt:"23:00",isClosed:false}))});
    await db.service.updateMany({where:{businessId:business.id},data:{sortOrder:2,bookingEnabled:true,durationMinutes:60}});
    await db.service.create({data:{businessId:business.id,name:"الخدمة المقدمة أولاً",price:100,sortOrder:3,isActive:true,bookingEnabled:true,durationMinutes:60}});
    const editorContext=await authenticatedContext(browser,{width:1440,height:1200},"light",seeded.sessionToken);
    try{
      const editor=await editorContext.newPage();
      await editor.goto(`${baseUrl}/dashboard/services`,{waitUntil:"networkidle"});
      const handle=editor.getByRole("button",{name:"اسحب لترتيب الخدمة المقدمة أولاً",exact:true});
      await handle.scrollIntoViewIfNeeded();
      const from=await handle.boundingBox();
      const to=await editor.getByRole("button",{name:"اسحب لترتيب استشارة أعمال",exact:true}).boundingBox();
      const serviceSave=editor.waitForResponse(response=>response.url().endsWith("/api/dashboard/services/order")&&response.request().method()==="POST",{timeout:15_000});
      await editor.mouse.move(from!.x+20,from!.y+20);await editor.mouse.down();await editor.mouse.move(to!.x+20,to!.y+20);await editor.mouse.up();
      expect((await serviceSave).status()).toBe(200);
      expect((await db.service.findMany({where:{businessId:business.id},orderBy:{sortOrder:"asc"}}))[0].name).toBe("الخدمة المقدمة أولاً");
      await editor.goto(`${baseUrl}/dashboard/my-page`,{waitUntil:"networkidle"});
      const sections=editor.getByRole("list",{name:"ترتيب أقسام الصفحة"}).getByRole("listitem");
      const movedId=await sections.last().getAttribute("data-section-id");
      await editor.getByRole("list",{name:"ترتيب أقسام الصفحة"}).scrollIntoViewIfNeeded();
      const sectionFrom=await sections.last().getByRole("button",{name:/^اسحب لترتيب/}).boundingBox();
      const sectionTo=await sections.first().boundingBox();
      const sectionSave=editor.waitForResponse(response=>response.url().endsWith("/api/dashboard/page-modules/order")&&response.request().method()==="POST",{timeout:15_000});
      await editor.mouse.move(sectionFrom!.x+20,sectionFrom!.y+20);await editor.mouse.down();await editor.mouse.move(sectionFrom!.x+20,sectionTo!.y+20);await editor.mouse.up();
      expect((await sectionSave).status()).toBe(200);
      await editor.reload({waitUntil:"networkidle"});
      await expect(editor.getByRole("list",{name:"ترتيب أقسام الصفحة"}).getByRole("listitem").first()).toHaveAttribute("data-section-id",movedId!);
    }finally{await editorContext.close();}
    const layouts=["عيادة","مطعم","متجر","مقاولات","لوجستيات","استشارات","ضيافة"];
    for(const [index,businessType] of layouts.entries()){
      const modules=getDefaultPageModules(businessType);
      for(const pageModule of modules){
        if(pageModule.id==="location")pageModule.sortOrder=0;
        else if(pageModule.id==="services")pageModule.sortOrder=1;
        else pageModule.sortOrder+=10;
        if(pageModule.id==="contact"){
          pageModule.config.bottomActions=[{id:"phone",enabled:true,sortOrder:0},{id:"whatsapp",enabled:false,sortOrder:1},{id:"share",enabled:true,sortOrder:2}];
          pageModule.config.serviceRequestEnabled=false;
          pageModule.config.bookingPlacement="ribbon";
        }
      }
      await db.business.update({where:{id:business.id},data:{businessType,isPublished:true,publishedAt:new Date(),bookingAvailable:true,pageModules:JSON.parse(JSON.stringify(modules))}});
      for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:960}]){
        const page=await browser.newPage({viewport});
        try{
          const response=await page.goto(`${baseUrl}/${business.slug}`,{waitUntil:"networkidle"});
          expect(response?.status()).toBe(200);
          await expect(page.getByRole("heading",{level:1,name:business.name})).toBeVisible();
          const serviceLinks=page.locator('#highlights a[href="#services"]');
          await expect(serviceLinks).toHaveCount(2);
          await expect(serviceLinks.first()).toContainText("الخدمة المقدمة أولاً");
          const ribbon=page.locator('[data-public-action-ribbon]');
          await expect(ribbon.getByRole('link',{name:'واتساب',exact:true})).toHaveCount(0);
          await expect(ribbon.locator('a,button')).toHaveText(['حجز موعد','اتصال','']);
          await expect(page.getByRole('button',{name:'طلب خدمة',exact:true})).toHaveCount(0);
          await expect(ribbon.getByRole('button',{name:'مشاركة',exact:true})).toBeVisible();
          const locations=await page.locator('[data-public-module="location"]').boundingBox();
          const services=await page.locator('#highlights').boundingBox();
          expect(locations!.y).toBeLessThan(services!.y);
          expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
          await page.screenshot({path:`${outDir}/activity-${index}-${viewport.width}.png`,fullPage:true});
          await page.getByRole('button',{name:'حجز موعد',exact:true}).click();
          const dialog=page.getByRole('dialog',{name:'حجز موعد',exact:true});
          await expect(dialog).toBeVisible();
          const bounds=await dialog.boundingBox();
          expect(bounds!.width).toBeLessThanOrEqual(viewport.width);
          await expect(dialog).not.toContainText(/المقاعد المتبقية|الحجوزات المتبقية/);
          await page.keyboard.press('Escape');
          await db.business.update({where:{id:business.id},data:{bookingAvailable:false}});
          await page.reload({waitUntil:'networkidle'});
          await expect(page.getByRole('button',{name:'حجز موعد',exact:true})).toHaveCount(0);
          await db.business.update({where:{id:business.id},data:{bookingAvailable:true}});
        }finally{await page.close();}
      }
    }
  });
  test("central booking forms support draft, publish, custom fields and deletion on mobile and desktop", async ({ browser }) => {
    test.setTimeout(180_000);
    if (!seeded) throw new Error("fixture missing");
    const key = "infro.booking-forms.v1";
    const existing = await db.$queryRaw<Array<{ draft: unknown; published: unknown }>>`SELECT "draft", "published" FROM "PlatformDesignSetting" WHERE "key"=${key}`;
    try {
      for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 960 }]) {
        const context = await authenticatedContext(browser, viewport, viewport.width === 390 ? "dark" : "light", seeded.adminSessionToken);
        const page = await context.newPage(); page.setDefaultTimeout(15_000);
        try {
          await page.goto(`${baseUrl}/admin/booking-forms`, { waitUntil: "domcontentloaded", timeout: 30_000 });
          await page.getByRole("button", { name: "إضافة نموذج", exact: true }).click();
          await expect(page.getByLabel("عنوان النموذج", { exact: true })).toHaveValue("نموذج حجز جديد");
          await page.getByLabel("عنوان النموذج", { exact: true }).fill("موعدك المميز");
          await page.getByRole("button", { name: "إضافة حقل", exact: true }).click();
          await page.getByLabel("عنوان الحقل", { exact: true }).fill("كيف نجهز زيارتك؟");
          await page.getByLabel("إلزامي", { exact: true }).check();
          await page.getByLabel("النموذج المختار للنشر", { exact: true }).selectOption({ label: "موعدك المميز" });
          await page.getByRole("button", { name: "حفظ مسودة", exact: true }).click();
          await expect(page.getByRole("status")).toHaveText("حُفظت المسودة دون تغيير نموذج الزوار");
          const draftRows = await db.$queryRaw<Array<{ draft: { activeId: string }; published: { activeId: string } }>>`SELECT "draft", "published" FROM "PlatformDesignSetting" WHERE "key"=${key}`;
          expect(draftRows[0].draft.activeId).not.toBe(draftRows[0].published.activeId);
          await expect(page.getByLabel("النموذج المختار للنشر", { exact: true })).toHaveValue(draftRows[0].draft.activeId);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
          await page.screenshot({ path: `${outDir}/booking-forms-${viewport.width}.png`, fullPage: true });
          await page.getByRole("button", { name: "نشر النموذج المختار", exact: true }).click();
          await expect(page.getByRole("status")).toHaveText("نُشر النموذج المحدد على صفحات الحجز");
          const rows = await db.$queryRaw<Array<{ draft: unknown; published: unknown }>>`SELECT "draft", "published" FROM "PlatformDesignSetting" WHERE "key"=${key}`;
          expect(rows[0].published).toEqual(rows[0].draft);
          const business = await db.business.findUniqueOrThrow({ where: { id: seeded.businessId } });
          const visitor = await browser.newPage({ viewport });
          try {
            await visitor.goto(`${baseUrl}/${business.slug}`, { waitUntil: "networkidle" });
            await visitor.getByRole("button", { name: "حجز موعد", exact: true }).click();
            const dialog = visitor.getByRole("dialog", { name: "موعدك المميز", exact: true });
            await expect(dialog).toBeVisible();
            await expect(dialog.getByLabel("كيف نجهز زيارتك؟", { exact: false })).toHaveAttribute("required", "");
            await expect(dialog.getByLabel("الاسم", { exact: true })).toHaveCount(0);
            await dialog.screenshot({ path: `${outDir}/booking-dialog-${viewport.width}.png` });
          } finally { await visitor.close(); }
          await page.getByRole("button", { name: "حذف الحقل 1", exact: true }).click();
          await expect(page.getByText("النموذج مختصر؛ لا توجد حقول إضافية.")).toBeVisible();
          await page.getByRole("button", { name: "حذف النموذج", exact: true }).click();
          await page.getByRole("button", { name: "نشر النموذج المختار", exact: true }).click();
          await expect(page.getByRole("status")).toHaveText("نُشر النموذج المحدد على صفحات الحجز");
          await expect.poll(async () => {
            const restored = await db.$queryRaw<Array<{ published: { activeId: string; forms: unknown[] } }>>`SELECT "published" FROM "PlatformDesignSetting" WHERE "key"=${key}`;
            return { activeId: restored[0]?.published.activeId, count: restored[0]?.published.forms.length };
          }).toEqual({ activeId: "default", count: 1 });
          await expect(page.getByRole("button", { name: "نشر النموذج المختار", exact: true })).toBeEnabled();
        } finally { await context.close(); }
      }
    } finally {
      if (existing[0]) await db.$executeRaw(Prisma.sql`UPDATE "PlatformDesignSetting" SET "draft"=${JSON.stringify(existing[0].draft)}::jsonb, "published"=${JSON.stringify(existing[0].published)}::jsonb WHERE "key"=${key}`);
      else await db.$executeRaw`DELETE FROM "PlatformDesignSetting" WHERE "key"=${key}`;
    }
  });

});
