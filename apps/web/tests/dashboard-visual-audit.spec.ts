import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.INFRO_VISUAL_AUDIT_DIR || "/tmp/infro-visual-audit";

type Seeded = { userId:string; businessId:string; sessionToken:string; adminUserId:string; adminSessionToken:string };
let pool:Pool; let db:PrismaClient; let seeded:Seeded|null=null;

async function seedWorkspace():Promise<Seeded>{
  const suffix=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const plan=await db.businessPlan.upsert({where:{code:"FREE"},update:{isActive:true},create:{code:"FREE",name:"Free",monthlyPrice:0,productLimit:3,isActive:true}});
  const user=await db.user.create({data:{name:"INFRO Visual QA",email:`infro-visual-${suffix}@hee.test`,passwordHash:"visual-only",emailVerifiedAt:new Date()}});
  const business=await db.business.create({data:{ownerId:user.id,planId:plan.id,name:"منشأة مراجعة INFRO",slug:`infro-visual-${suffix}`,businessType:"خدمات أعمال",shortDescription:"مساحة اختبار بصرية ووظيفية قبل الإطلاق",description:"بيانات مؤقتة لمراجعة واجهة INFRO.",phone:"0555000011",whatsapp:"966555000011",city:"الرياض",district:"العليا",isPublished:false,onboardingCompleted:true}});
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
  return{userId:user.id,businessId:business.id,sessionToken,adminUserId:admin.id,adminSessionToken};
}

async function cleanupWorkspace(value:Seeded){
  await db.analyticsEvent.deleteMany({where:{businessId:value.businessId}});
  await db.$executeRaw(Prisma.sql`DELETE FROM "BusinessNote" WHERE "businessId"=${value.businessId}`);
  await db.branch.deleteMany({where:{businessId:value.businessId}});
  await db.service.deleteMany({where:{businessId:value.businessId}});
  await db.subscription.deleteMany({where:{businessId:value.businessId}});
  await db.session.deleteMany({where:{userId:value.userId}});
  await db.business.deleteMany({where:{id:value.businessId}});
  await db.authIdentity.deleteMany({where:{userId:value.userId}});
  await db.user.deleteMany({where:{id:value.userId}});
  await db.session.deleteMany({where:{userId:value.adminUserId}});
  await db.user.deleteMany({where:{id:value.adminUserId,businesses:{none:{}}}});
}

async function authenticatedContext(browser:Browser,viewport:{width:number;height:number},theme:"light"|"dark",token:string):Promise<BrowserContext>{
  const context=await browser.newContext({viewport});
  await context.addCookies([{name:"hee_session",value:token,url:baseUrl}]);
  await context.addInitScript(([key,value])=>{try{localStorage.setItem(key,value);}catch{/* about:blank has an opaque origin */}},["infro-dashboard-theme",theme]);
  return context;
}

async function auditRoute(context:BrowserContext,input:{path:string;expectedPath?:string;name:string;theme:"light"|"dark";viewportName:string}){
  const page=await context.newPage();
  await page.goto(`${baseUrl}${input.path}`,{waitUntil:"domcontentloaded"});
  expect(page.url()).not.toContain("/login");
  await expect(page.locator("[data-dashboard-path]")).toBeVisible();
  await page.waitForTimeout(350);
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

async function auditPublicRoute(browser:Browser,input:{path:string;name:"homepage"|"register"|"login";viewportName:string;viewport:{width:number;height:number}}){
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

async function auditAdminRoute(browser:Browser,input:{theme:"light"|"dark";viewportName:string;viewport:{width:number;height:number};token:string}){
  const context=await authenticatedContext(browser,input.viewport,input.theme,input.token);
  const page=await context.newPage();
  try{
    const response=await page.goto(`${baseUrl}/admin`,{waitUntil:"domcontentloaded"});
    expect(response?.status()).toBe(200);
    await expect(page.locator("[data-admin-shell]")).toBeVisible();
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
    return{...metrics,file,url:`${baseUrl}/admin`};
  }finally{
    await page.close();
    await context.close();
  }
}

test.describe.serial("authenticated INFRO visual audit",()=>{
  test.beforeAll(async()=>{await mkdir(outDir,{recursive:true});const connectionString=String(process.env.DATABASE_URL??"").trim();if(!connectionString)throw new Error("DATABASE_URL is required");pool=new Pool({connectionString,max:4});db=new PrismaClient({adapter:new PrismaPg(pool)});seeded=await seedWorkspace();});
  test.afterAll(async()=>{if(seeded)await cleanupWorkspace(seeded);await db?.$disconnect();await pool?.end();});
  test("captures launch-critical public and authenticated surfaces without overflow, collisions, light islands or compressed grids",async({browser})=>{
    test.setTimeout(600_000);if(!seeded)throw new Error("visual fixture missing");
    const routes=[{path:"/dashboard",name:"command-space"},{path:"/dashboard/notes",name:"business-memory"},{path:"/dashboard/reminders",name:"smart-reminders"},{path:"/dashboard/digital-identity",name:"digital-identity"},{path:"/dashboard/billing/manage",name:"billing"},{path:"/dashboard/whatsapp",expectedPath:"/dashboard/billing/manage",name:"whatsapp-gate"}];
    const viewports=[{name:"desktop",value:{width:1440,height:960}},{name:"mobile",value:{width:390,height:844}}] as const;
    const results:unknown[]=[];
    for(const viewport of viewports)for(const theme of ["light","dark"] as const){const context=await authenticatedContext(browser,viewport.value,theme,seeded.sessionToken);try{for(const route of routes)results.push(await auditRoute(context,{...route,theme,viewportName:viewport.name}));}finally{await context.close();}}
    for(const theme of ["light","dark"] as const){const context=await authenticatedContext(browser,{width:1536,height:1024},theme,seeded.sessionToken);try{results.push(await auditRoute(context,{path:"/dashboard",name:"command-space",theme,viewportName:"desktop-wide"}));}finally{await context.close();}}
    for(const publicViewport of [{viewportName:"public-desktop",viewport:{width:1440,height:960}},{viewportName:"public-tablet",viewport:{width:768,height:1024}},{viewportName:"public-mobile",viewport:{width:390,height:844}}]){
      results.push(await auditPublicRoute(browser,{path:"/",name:"homepage",...publicViewport}));
      results.push(await auditPublicRoute(browser,{path:"/register",name:"register",...publicViewport}));
      results.push(await auditPublicRoute(browser,{path:"/login",name:"login",...publicViewport}));
    }
    for(const adminViewport of [{viewportName:"desktop",viewport:{width:1440,height:960}},{viewportName:"tablet",viewport:{width:768,height:1024}},{viewportName:"mobile",viewport:{width:390,height:844}}])for(const theme of ["light","dark"] as const)results.push(await auditAdminRoute(browser,{...adminViewport,theme,token:seeded.adminSessionToken}));
    await writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2),"utf8");
  });
});
