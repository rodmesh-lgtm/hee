"use server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../lib/admin";
import { db } from "../lib/db";
import { BOOKING_FORM_KEY, DEFAULT_BOOKING_CATALOG, parseBookingCatalog } from "../lib/booking-form-domain";

export async function saveBookingFormsAction(_previous: { error?: string; saved?: string }, data: FormData): Promise<{ error?: string; saved?: string }> {
  const admin = await requireAdmin();
  const raw = String(data.get("catalog") ?? "");
  const publish = data.get("intent") === "publish";
  let catalog;
  try {
    if (raw.length > 30000) throw new Error("النموذج أكبر من المسموح");
    catalog = parseBookingCatalog(JSON.parse(raw));
  } catch (error) { return { error: error instanceof Error ? error.message : "تحقق من إعدادات النموذج" }; }
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${BOOKING_FORM_KEY}))`;
    const rows = await tx.$queryRaw<Array<{ draft: unknown; published: unknown }>>(Prisma.sql`SELECT "draft", "published" FROM "PlatformDesignSetting" WHERE "key"=${BOOKING_FORM_KEY} FOR UPDATE`);
    const before = rows[0]?.draft ?? DEFAULT_BOOKING_CATALOG;
    const published = publish ? catalog : rows[0]?.published ?? DEFAULT_BOOKING_CATALOG;
    const now = new Date();
    await tx.$executeRaw(Prisma.sql`INSERT INTO "PlatformDesignSetting" ("key","draft","published","updatedByUserId","createdAt","updatedAt","publishedAt") VALUES (${BOOKING_FORM_KEY},${JSON.stringify(catalog)}::jsonb,${JSON.stringify(published)}::jsonb,${admin.id},${now},${now},${publish ? now : null}) ON CONFLICT ("key") DO UPDATE SET "draft"=EXCLUDED."draft", "published"=EXCLUDED."published", "updatedByUserId"=EXCLUDED."updatedByUserId", "updatedAt"=EXCLUDED."updatedAt", "publishedAt"=CASE WHEN ${publish} THEN EXCLUDED."publishedAt" ELSE "PlatformDesignSetting"."publishedAt" END`);
    await tx.$executeRaw(Prisma.sql`INSERT INTO "PlatformDesignAudit" ("id","settingKey","actorUserId","action","before","after","createdAt") VALUES (${randomUUID()},${BOOKING_FORM_KEY},${admin.id},${publish ? "publish" : "save_draft"},${JSON.stringify(before)}::jsonb,${JSON.stringify(catalog)}::jsonb,${now})`);
  });
  revalidatePath("/admin/booking-forms");
  if (publish) revalidatePath("/", "layout");
  return { saved: publish ? "نُشر النموذج المحدد على صفحات الحجز" : "حُفظت المسودة دون تغيير نموذج الزوار" };
}
