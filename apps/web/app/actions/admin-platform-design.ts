"use server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../lib/admin";
import { db } from "../lib/db";
import { DEFAULT_PLATFORM_DESIGN, readPlatformDesign, sanitizePlatformDesign } from "../lib/platform-design";
import { PLATFORM_BRAND_SETTING_KEY } from "../../lib/platform-brand-config";

function formConfig(form: FormData) {
  const keywords=String(form.get("seoKeywords")??"").split(",").map(v=>v.trim()).filter(Boolean);
  const raw: Record<string,unknown>={seoKeywords:keywords};
  for (const key of ["brandNameAr","brandNameEn","logoUrl","logoDarkUrl","faviconUrl","primaryColor","secondaryColor","accentColor","backgroundColor","foregroundColor","headerBackground","headerForeground","footerBackground","footerForeground","seoTitleAr","seoTitleEn","seoDescriptionAr","seoDescriptionEn","ogImageUrl","headerCtaLabel","headerCtaHref","footerCopyright","homeHeroTitleAr","homeHeroSubtitleAr"]) raw[key]=form.get(key);
  for (const key of ["robotsIndex","robotsFollow","customerPageBrandingEnabled","customerHeaderEnabled","customerFooterEnabled"]) raw[key]=form.get(key)==="on";
  return sanitizePlatformDesign(raw);
}

async function write(actorId:string, action:string, next:unknown, publish=false) {
  const current=await readPlatformDesign(); const cfg=sanitizePlatformDesign(next); const now=new Date();
  await db.$transaction(async tx=>{
    await tx.$executeRaw(Prisma.sql`INSERT INTO "PlatformDesignSetting" ("key","draft","published","updatedByUserId","createdAt","updatedAt","publishedAt") VALUES (${PLATFORM_BRAND_SETTING_KEY},${JSON.stringify(cfg)}::jsonb,${JSON.stringify(publish?cfg:current.published)}::jsonb,${actorId},${now},${now},${publish?now:null}) ON CONFLICT ("key") DO UPDATE SET "draft"=EXCLUDED."draft", "published"=${JSON.stringify(publish?cfg:current.published)}::jsonb, "updatedByUserId"=${actorId}, "updatedAt"=${now}, "publishedAt"=${publish?now:current.publishedAt}`);
    await tx.$executeRaw(Prisma.sql`INSERT INTO "PlatformDesignAudit" ("id","settingKey","actorUserId","action","before","after","createdAt") VALUES (${randomUUID()},${PLATFORM_BRAND_SETTING_KEY},${actorId},${action},${JSON.stringify(current.draft)}::jsonb,${JSON.stringify(cfg)}::jsonb,${now})`);
  });
  revalidatePath("/admin/design"); revalidatePath("/", "layout");
}
export async function savePlatformDesignDraftAction(form:FormData){const a=await requireAdmin(); await write(a.id,"save_draft",formConfig(form));}
export async function publishPlatformDesignAction(form:FormData){const a=await requireAdmin(); await write(a.id,"publish",formConfig(form),true);}
export async function restorePlatformDesignAction(){const a=await requireAdmin(); await write(a.id,"restore_defaults",DEFAULT_PLATFORM_DESIGN,true);}
