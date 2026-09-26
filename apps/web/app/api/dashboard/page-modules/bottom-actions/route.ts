import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { getOwnedBusinessForApiWrite } from "../../../../lib/ownership";
import { normalizePageModulesForPersistence, serializePageModules } from "../../../../lib/page-modules";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../lib/rate-limit";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../../lib/request-body";

const ids = ["whatsapp", "phone", "email", "website", "share"] as const;
const schema = z.object({ serviceRequestEnabled: z.boolean().optional(), bookingPlacement: z.enum(["panel", "ribbon"]).optional(), actions: z.array(z.object({ id: z.enum(ids), enabled: z.boolean(), sortOrder: z.number().int().min(0).max(9), label: z.string().max(24).optional() }).strict()).min(1).max(5) }).strict();

export async function POST(request: Request) {
  const business = await getOwnedBusinessForApiWrite();
  if (!business) return NextResponse.json({ error: "يرجى تسجيل الدخول وإنشاء النشاط أولاً" }, { status: 401 });
  try {
    const identity = requestClientAddress(request) || business.ownerId;
    const rate = await consumePublicWriteLimit({ scope: "dashboard-bottom-actions", businessId: business.id, identity, limit: 30, windowSeconds: 10 * 60 });
    if (!rate.allowed) return NextResponse.json({ error: "تم حفظ تعديلات كثيرة خلال وقت قصير. انتظر قليلاً ثم تابع." }, { status: 429 });
  } catch { return NextResponse.json({ error: "تعذر حفظ الإعدادات الآن." }, { status: 503 }); }
  let body: unknown;
  try { body = await readBoundedJson(request, 8 * 1024); } catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyTooLargeError ? "حجم الطلب أكبر من المسموح" : "بيانات غير صالحة" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || new Set(parsed.data.actions.map((item) => item.id)).size !== parsed.data.actions.length) return NextResponse.json({ error: "إعدادات الشريط غير صالحة" }, { status: 400 });
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`bottom-actions:${business.id}`}))`;
      const current = await tx.business.findFirst({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, select: { id: true, slug: true, businessType: true, pageModules: true } });
      if (!current) return null;
      const modules = normalizePageModulesForPersistence(current.pageModules, current.businessType);
      const updated = modules.map((module) => module.id === "contact" ? { ...module, config: { ...module.config, ...(parsed.data.serviceRequestEnabled !== undefined ? { serviceRequestEnabled: parsed.data.serviceRequestEnabled } : {}), ...(parsed.data.bookingPlacement ? { bookingPlacement: parsed.data.bookingPlacement } : {}), bottomActions: parsed.data.actions.map((item, index) => ({ ...item, sortOrder: index })) } } : module);
      await tx.business.update({ where: { id: current.id }, data: { pageModules: serializePageModules(updated) as unknown as Prisma.InputJsonValue } });
      return current.slug;
    });
    if (!result) return NextResponse.json({ error: "تعذر العثور على النشاط" }, { status: 409 });
    revalidatePath("/dashboard/my-page"); revalidatePath("/preview"); revalidatePath(`/${result}`);
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("[bottom-actions] write_failed", { businessId: business.id, error }); return NextResponse.json({ error: "تعذر حفظ الإعدادات الآن." }, { status: 503 }); }
}
