"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getCurrentUserForApiWrite } from "../lib/auth";
import { CASHIER_OUTPUT_VAT_ACCOUNT, normalizeCashierVatNumber } from "../lib/cashier-tax";
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
      if (enabled) {
        const [book] = await tx.$queryRaw<Array<{ initializedAt: Date | null }>>`
          SELECT "initializedAt" FROM "LaundryBook" WHERE "businessId" = ${business.id}
        `;
        if (!book?.initializedAt) throw new LaundryInputError("هيّئ دفتر المحاسبة أولًا لترحيل ضريبة المبيعات.");
        await tx.$executeRaw`
          INSERT INTO "LaundryAccount" ("businessId", code, name, kind)
          VALUES (${business.id}, ${CASHIER_OUTPUT_VAT_ACCOUNT}, 'ضريبة القيمة المضافة على المبيعات', 'liability')
          ON CONFLICT ("businessId", code) DO NOTHING
        `;
        const [account] = await tx.$queryRaw<Array<{ name: string; kind: string }>>`
          SELECT name, kind FROM "LaundryAccount" WHERE "businessId" = ${business.id} AND code = ${CASHIER_OUTPUT_VAT_ACCOUNT}
        `;
        if (account?.kind !== "liability" || account.name !== "ضريبة القيمة المضافة على المبيعات") {
          throw new LaundryInputError("رمز حساب ضريبة المبيعات مستخدم لحساب آخر. راجع دليل الحسابات.");
        }
      }
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
