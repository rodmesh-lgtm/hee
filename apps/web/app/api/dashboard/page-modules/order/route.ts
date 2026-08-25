import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../../../lib/db";
import { getOwnedBusinessForApiWrite } from "../../../../../lib/ownership";
import { normalizePageModulesForPersistence, serializePageModules, type PageModuleId } from "../../../../../lib/page-modules";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../../lib/rate-limit";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../../../lib/request-body";

const reorderableIds = ["about", "services", "location", "contactTeam", "portfolio", "contact"] as const satisfies readonly PageModuleId[];
const reorderableSet = new Set<string>(reorderableIds);

const schema = z.object({
  orderedIds: z.array(z.enum(reorderableIds)).length(reorderableIds.length),
}).strict();

export async function POST(request: Request) {
  const business = await getOwnedBusinessForApiWrite();
  if (!business) return NextResponse.json({ error: "يرجى تسجيل الدخول وإنشاء النشاط أولاً" }, { status: 401 });

  try {
    const identity = requestClientAddress(request) || business.ownerId;
    const rate = await consumePublicWriteLimit({ scope: "dashboard-page-module-order", businessId: business.id, identity, limit: 40, windowSeconds: 10 * 60 });
    if (!rate.allowed) return NextResponse.json({ error: "تم حفظ ترتيبات كثيرة خلال وقت قصير. انتظر قليلاً ثم تابع." }, { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } });
  } catch (error) {
    console.error("[page-module-order] rate_limit_failed", { businessId: business.id, error });
    return NextResponse.json({ error: "تعذر حفظ ترتيب الصفحة الآن. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }

  let body: unknown;
  try { body = await readBoundedJson(request, 8 * 1024); }
  catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyTooLargeError ? "حجم الطلب أكبر من المسموح" : "بيانات غير صالحة" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success || new Set(parsed.success ? parsed.data.orderedIds : []).size !== reorderableIds.length) {
    return NextResponse.json({ error: "ترتيب الأقسام غير صالح" }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`page-module-order:${business.id}`}))`;
      const current = await tx.business.findFirst({
        where: { id: business.id, ownerId: business.ownerId, deletedAt: null },
        select: { id: true, slug: true, businessType: true, pageModules: true },
      });
      if (!current) return null;

      const modules = normalizePageModulesForPersistence(current.pageModules, current.businessType);
      const rank = new Map(parsed.data.orderedIds.map((id, index) => [id, index]));
      const ordered = [...modules].sort((left, right) => {
        const leftManaged = reorderableSet.has(left.id);
        const rightManaged = reorderableSet.has(right.id);
        if (leftManaged && rightManaged) return (rank.get(left.id as typeof reorderableIds[number]) ?? 0) - (rank.get(right.id as typeof reorderableIds[number]) ?? 0);
        if (leftManaged) return -1;
        if (rightManaged) return 1;
        return left.sortOrder - right.sortOrder;
      });
      const serialized = serializePageModules(ordered);
      await tx.business.update({ where: { id: current.id }, data: { pageModules: serialized as unknown as Prisma.InputJsonValue } });
      return current.slug;
    });

    if (!result) return NextResponse.json({ error: "تعذر العثور على النشاط أو لم يعد متاحًا للتعديل" }, { status: 409 });
    revalidatePath("/dashboard/my-page");
    revalidatePath("/preview");
    revalidatePath(`/${result}`);
    return NextResponse.json({ ok: true, orderedIds: parsed.data.orderedIds });
  } catch (error) {
    console.error("[page-module-order] write_failed", { businessId: business.id, error });
    return NextResponse.json({ error: "تعذر حفظ ترتيب الصفحة الآن. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }
}
