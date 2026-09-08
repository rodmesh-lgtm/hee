import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.INFRO_VISUAL_AUDIT_DIR || "/tmp/infro-visual-audit";

type Seeded = { userId:string; businessId:string; sessionToken:string };
let pool:Pool; let db:PrismaClient; let seeded:Seeded|null=null;

async function seedWorkspace():Promise<Seeded>{
  const suffix=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const plan=await db.businessPlan.upsert({where:{code:"FREE"},update:{isActive:true},create:{code:"FREE",name:"Free",monthlyPrice:0,productLimit:3,isActive:true}});
  const user=await db.user.create({data:{name:"INFRO Visual QA",email:`infro-visual-${suffix}@hee.test`,passwordHash:"visual-only",emailVerifiedAt:new Date()}});
  const business=await db.business.create({data:{ownerId:user.id,planId:plan.id,name:"منشأة مراجعة INFRO",slug:`infro-visual-${suffix}`,businessType:"خدمات أعمال",shortDescription:"مساحة اختبار بصرية ووظيفية قبل الإطلاق",description:"بيانات مؤقتة لمراجعة واجهة INFRO.",phone:"0555000011",whatsapp:"966555000011",city:"الرياض",district:"العليا",isPublished:false,onboardingCompleted:true}});
  await db.service.create({data:{businessId:business.id,name:"استشارة أعمال",description:"خدمة اختبار",price:250,sortOrder:0}});
  await db.branch.create({data:{businessId:business.id,name:"الفرع الرئيسي",city:"الرياض",district:"العليا",isMain:true,sortOrder:0}});
  const sessionToken=crypto.randomUUID();
  await db.session.create({data:{token:sessionToken,userId:user.id,expiresAt:new Date(Date.now()+60*60*1000)}});
  return{userId:user.id,businessId:business.id,sessionToken};
}

async function cleanupWorkspace(value:Seeded){
  await db.analyticsEvent.deleteMany({where:{businessId:value.businessId}});
  await db.branch.deleteMany({where:{businessId:value.businessId}});
  await db.service.deleteMany({where:{businessId:value.businessId}});
  await db.subscription.deleteMany({where:{businessId:value.businessId}});
  await db.session.deleteMany({where:{userId:value.userId}});
  await db.business.deleteMany({where:{id:value.businessId}});
  await db.authIdentity.deleteMany({where:{userId:value.userId}});
  await db.user.deleteMany({where:{id:value.userId}});
}

async function authenticatedContext(browser:Browser,viewport:{width:number;height:number},theme:"light"|"dark",token:string):Promise<BrowserContext>{
  const context=await browser.newContext({viewport});
  await context.addCookies([{name:"hee_session",value:token,url:baseUrl}]);
  await context.addInitScript(([key,value])=>localStorage.setItem(key,value),["infro-dashboard-theme",theme]);
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
    const largeLight=[...document.querySelectorAll<HTMLElement>("main section,main article")].filter(el=>{
      const r=el.getBoundingClientRect(); if(r.width<140||r.height<72)return false;
      const rgb=getComputedStyle(el).backgroundColor.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number)??[];
      return rgb.length===3&&rgb.every(v=>v>242);
    }).length;
    const dashboardGrid=document.querySelector<HTMLElement>("#dashboard-main-content>div");
    const canvasWidth=document.querySelector<HTMLElement>("#dashboard-main-content")?.getBoundingClientRect().width??0;
    const directChildren=dashboardGrid?[...dashboardGrid.children].map((el,index)=>{const node=el as HTMLElement,r=node.getBoundingClientRect();return{index,tag:node.tagName.toLowerCase(),width:Math.round(r.width),height:Math.round(r.height),left:Math.round(r.left),top:Math.round(r.top),text:(node.innerText||"").replace(/\s+/g," ").trim().slice(0,80)}}):[];
    const rects=directChildren.map(item=>({left:item.left,right:item.left+item.width,top:item.top,bottom:item.top+item.height,width:item.width,height:item.height}));
    const splitExpected=canvasWidth>=1100;
    const minExpectedWidth=splitExpected?Math.max(500,canvasWidth*.42):Math.max(0,canvasWidth-40);
    const compressedDirectChildren=window.innerWidth>=1280?directChildren.filter(item=>item.width>0&&item.width<minExpectedWidth).length:0;
    const collisions=rects.flatMap((a,i)=>rects.slice(i+1).map(b=>({a,b}))).filter(({a,b})=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2).length;
    return{path:root?.dataset.dashboardPath??null,theme:root?.dataset.dashboardTheme??null,overflow:document.documentElement.scrollWidth-window.innerWidth,largeLightSurfaces:largeLight,bodyHeight:document.body.scrollHeight,canvasWidth:Math.round(canvasWidth),splitExpected,minExpectedWidth:Math.round(minExpectedWidth),compressedDirectChildren,collisions,directChildren};
  });
  const file=`${input.viewportName}-${input.theme}-${input.name}.png`;
  await page.screenshot({path:`${outDir}/${file}`,fullPage:true});
  await writeFile(`${outDir}/${input.viewportName}-${input.theme}-${input.name}.json`,JSON.stringify({...metrics,file,url:`${baseUrl}${input.path}`},null,2),"utf8");
  await page.close();
  expect(metrics.overflow).toBeLessThanOrEqual(2);
  expect(metrics.path).toBe(input.expectedPath??input.path.split("?")[0]);
  expect(metrics.theme).toBe(input.theme);
  if(input.theme==="dark")expect(metrics.largeLightSurfaces).toBe(0);
  if(input.name==="command-space"&&input.viewportName==="desktop"){
    expect(metrics.compressedDirectChildren).toBe(0);
    expect(metrics.collisions).toBe(0);
  }
  return{...metrics,file,url:`${baseUrl}${input.path}`};
}

test.describe.serial("authenticated INFRO visual audit",()=>{
  test.beforeAll(async()=>{await mkdir(outDir,{recursive:true});const connectionString=String(process.env.DATABASE_URL??"").trim();if(!connectionString)throw new Error("DATABASE_URL is required");pool=new Pool({connectionString,max:4});db=new PrismaClient({adapter:new PrismaPg(pool)});seeded=await seedWorkspace();});
  test.afterAll(async()=>{if(seeded)await cleanupWorkspace(seeded);await db?.$disconnect();await pool?.end();});

  test("captures desktop/mobile light/dark customer workspaces without overflow, dark islands, compressed grid children or collisions",async({browser})=>{
    test.setTimeout(240_000);if(!seeded)throw new Error("visual fixture missing");
    const routes=[
      {path:"/dashboard",name:"command-space"},
      {path:"/dashboard/notes",name:"business-memory"},
      {path:"/dashboard/reminders",name:"smart-reminders"},
      {path:"/dashboard/digital-identity",name:"digital-identity"},
      {path:"/dashboard/billing/manage",name:"billing"},
      {path:"/dashboard/whatsapp",expectedPath:"/dashboard/billing/manage",name:"whatsapp-gate"},
    ];
    const viewports=[{name:"desktop",value:{width:1440,height:960}},{name:"mobile",value:{width:390,height:844}}] as const;
    const results:unknown[]=[];
    for(const viewport of viewports)for(const theme of ["light","dark"] as const){const context=await authenticatedContext(browser,viewport.value,theme,seeded.sessionToken);try{for(const route of routes)results.push(await auditRoute(context,{...route,theme,viewportName:viewport.name}));}finally{await context.close();}}
    await writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2),"utf8");
  });
});
