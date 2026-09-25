import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { getDefaultPageModules } from "../app/lib/page-modules";

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
  await db.user.deleteMany({where:{id:value.adminUserId,businesses:{none:{}}}});
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
  test.beforeAll(async()=>{await mkdir(outDir,{recursive:true});const connectionString=String(process.env.DATABASE_URL??"").trim();if(!connectionString)throw new Error("DATABASE_URL is required");pool=new Pool({connectionString,max:4});db=new PrismaClient({adapter:new PrismaPg(pool)});seeded=await seedWorkspace();});
  test.afterAll(async()=>{if(seeded)await cleanupWorkspace(seeded);await db?.$disconnect();await pool?.end();});
  test("commerce operations deny a regular customer session",async({browser})=>{
    if(!seeded)throw new Error("visual fixture missing");
    const context=await authenticatedContext(browser,{width:390,height:844},"light",seeded.sessionToken);
    try{const page=await context.newPage();await page.goto(`${baseUrl}/admin/commerce`);await expect(page).toHaveURL(/\/admin-login/);await expect(page.getByRole("heading",{name:"صحة تكاملات المتاجر",exact:true})).toHaveCount(0);}finally{await context.close();}
  });
  test("captures launch-critical public and authenticated surfaces without overflow, collisions, light islands or compressed grids",async({browser})=>{
    test.setTimeout(600_000);if(!seeded)throw new Error("visual fixture missing");
    const routes=[{path:"/dashboard",name:"command-space"},{path:"/dashboard/notes",name:"business-memory"},{path:"/dashboard/reminders",name:"smart-reminders"},{path:"/dashboard/digital-identity",name:"digital-identity"},{path:"/dashboard/tools",name:"tools"},{path:"/dashboard/verification",name:"verification"},{path:"/dashboard/billing/manage",name:"billing"},{path:"/dashboard/whatsapp",expectedPath:"/dashboard/billing/manage",name:"whatsapp-gate"}];
    routes.push({path:"/dashboard/my-page",name:"my-page"},{path:"/dashboard/working-hours",name:"booking-schedule"},{path:"/dashboard/services",name:"services"},{path:"/dashboard/inbox",name:"inbox"},{path:"/dashboard/settings",name:"settings"});
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
        if(pageModule.id==="contact")pageModule.config.bottomActions=[{id:"phone",enabled:true,sortOrder:0},{id:"whatsapp",enabled:false,sortOrder:1},{id:"share",enabled:true,sortOrder:2}];
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
          await expect(ribbon.locator('a,button')).toHaveText(['اتصال','']);
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
});
