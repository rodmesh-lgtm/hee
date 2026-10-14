import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../lib/db";
import { getOwnedBusinessForApiWrite } from "../../../lib/ownership";
import { normalizePageModulesForPersistence, serializePageModules } from "../../../lib/page-modules";
import { IDENTITY_FONTS, normalizeIdentityAppearance } from "../../../lib/public-identity-appearance";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../lib/request-body";

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const schema = z.object({ businessId: z.string().min(1).max(100), appearance: z.object({ primary: color, accent: color, background: color, font: z.enum(IDENTITY_FONTS) }).strict() }).strict();
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "مصدر الطلب غير مسموح" }, { status: 403 });
  const business = await getOwnedBusinessForApiWrite("page");
  if (!business) return NextResponse.json({ error: "لا تملك صلاحية تعديل مظهر الصفحة" }, { status: 403 });
  let body: unknown;
  try { body = await readBoundedJson(request, 2048); }
  catch (error) { return NextResponse.json({ error: "بيانات المظهر غير صالحة" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "اختر ألوانًا بصيغة HEX وخطًا من القائمة" }, { status: 400 });
  if (parsed.data.businessId !== business.id) return NextResponse.json({ error: "تغيرت المنشأة النشطة. حدّث الصفحة قبل الحفظ." }, { status: 409 });
  try {
    const rate = await consumePublicWriteLimit({ scope: "dashboard-page-appearance", businessId: business.id, identity: requestClientAddress(request) || business.ownerId, limit: 40, windowSeconds: 600 });
    if (!rate.allowed) return NextResponse.json({ error: "انتظر قليلاً ثم أعد المحاولة" }, { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } });
    const appearance = normalizeIdentityAppearance(parsed.data.appearance);
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`business-autosave:${business.id}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`page-module-order:${business.id}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`bottom-actions:${business.id}`}))`;
      const current = await tx.business.findFirst({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null }, select: { pageModules: true, businessType: true, updatedAt: true, slug: true } });
      if (!current) return null;
      const modules = normalizePageModulesForPersistence(current.pageModules, current.businessType).map(module => module.id === "contact" ? { ...module, config: { ...module.config, appearance } } : module);
      const write = await tx.business.updateMany({ where: { id: business.id, ownerId: business.ownerId, deletedAt: null, updatedAt: current.updatedAt }, data: { pageModules: serializePageModules(modules) as unknown as Prisma.InputJsonValue } });
      return write.count === 1 ? current.slug : null;
    });
    if (!result) return NextResponse.json({ error: "تم تعديل الصفحة بالتزامن. حدّثها ثم أعد المحاولة." }, { status: 409 });
    revalidatePath("/dashboard/branding"); revalidatePath("/preview"); revalidatePath(`/${result}`);
    return NextResponse.json({ ok: true, appearance });
  } catch { return NextResponse.json({ error: "تعذر حفظ المظهر الآن. حاول مرة أخرى." }, { status: 503 }); }
}
