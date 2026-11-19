"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getCurrentUserForApiWrite } from "../lib/auth";
import { normalizeCashierVatNumber } from "../lib/cashier-tax";
import { ensureCashierOutputVatAccount } from "../lib/cashier-tax-server";
import { db } from "../lib/db";
import { LaundryInputError } from "../lib/laundry-domain";

const profileInput = z.object({
  businessId: z.string().uuid(),
  sellerName: z.string().trim().min(2).max(255).refine(value => Buffer.byteLength(value, "utf8") <= 255),
  sellerAddress: z.string().trim().min(5).max(300),
  vatNumber: z.string().trim().transform(normalizeCashierVatNumber).pipe(z.string().regex(/^3[0-9]{13}3$/)),
  mode: z.enum(["disabled", "retail_phase_one"]),
  confirmed: z.boolean(),
});

export async function saveCashierTaxProfile(value: unknown) {
  const parsed = profileInput.safeParse(value);
  if (!parsed.success) return { ok: false, error: "تحقق من الاسم والعنوان ورقم التسجيل الضريبي المكوّن من 15 رقمًا." };
  const input = parsed.data;
  const user = await getCurrentUserForApiWrite();
  const business = user && await getActiveBusinessForUser(user.id, "laundry");
  if (!user || !business || business.id !== input.businessId || business.ownerId !== user.id) {
    return { ok: false, error: "إعداد الضريبة متاح لمالك المنشأة النشطة." };
  }
  const enabled = input.mode === "retail_phase_one";
  if (enabled && !input.confirmed) {
    return { ok: false, error: "أكّد أهلية منشأتك للمرحلة الأولى وأن أسعار الكاشير تشمل الضريبة." };
  }

  try {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${business.id}`}))`;
      const owned = await tx.business.findFirst({ where: { id: business.id, ownerId: user.id, deletedAt: null }, select: { id: true } });
      if (!owned) throw new LaundryInputError("المنشأة غير متاحة.");
      const [device] = await tx.$queryRaw<Array<{ active: boolean }>>`SELECT active FROM "CashierZatcaDevice"
        WHERE "businessId"=${business.id} AND environment='production' AND credentials IS NOT NULL ORDER BY active DESC LIMIT 1`;
      if (device) {
        const [current] = await tx.$queryRaw<Array<{ sellerName: string; sellerAddress: string; vatNumber: string; enabled: boolean }>>`
          SELECT * FROM "CashierTaxProfile" WHERE "businessId"=${business.id}`;
        if (current && (current.sellerName !== input.sellerName || current.sellerAddress !== input.sellerAddress ||
            current.vatNumber !== input.vatNumber || (device.active && current.enabled && !enabled))) {
          throw new LaundryInputError("بيانات البائع مرتبطة بجهاز زاتكا. راجع إعدادات جهاز الإصدار قبل تعديلها.");
        }
      }
      if (enabled) await ensureCashierOutputVatAccount(tx, business.id);
      await tx.$executeRaw`
        INSERT INTO "CashierTaxProfile" ("businessId", "sellerName", "sellerAddress", "vatNumber", "enabled")
        VALUES (${business.id}, ${input.sellerName}, ${input.sellerAddress}, ${input.vatNumber}, ${enabled})
        ON CONFLICT ("businessId") DO UPDATE SET "sellerName" = EXCLUDED."sellerName",
          "sellerAddress" = EXCLUDED."sellerAddress", "vatNumber" = EXCLUDED."vatNumber", "enabled" = EXCLUDED."enabled"
      `;
      await tx.$executeRaw`
        INSERT INTO "LaundryAudit" (id, "businessId", "actorId", action, "targetId")
        VALUES (${randomUUID()}, ${business.id}, ${user.id}, ${enabled ? "tax-phase-one-enabled" : "tax-profile-saved"}, ${business.id})
      `;
    });
    revalidatePath("/Accounting");
    revalidatePath("/Laundromat");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof LaundryInputError ? error.message : "تعذر حفظ بيانات الضريبة. أعد المحاولة." };
  }
}
