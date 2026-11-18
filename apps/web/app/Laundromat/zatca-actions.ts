"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getCurrentUserForApiWrite } from "../lib/auth";
import { db } from "../lib/db";
import { cashierTaxProfile, ensureCashierOutputVatAccount } from "../lib/cashier-tax-server";
import { buildZatcaInvoice, signZatcaInvoice, zatcaAddress } from "../lib/cashier-zatca-document";
import { onboardZatcaDevice, reportZatcaInvoice, ZatcaGatewayError } from "../lib/cashier-zatca-gateway";
import { sealZatcaCredentials, zatcaConfiguration } from "../lib/cashier-zatca-server";

const connectInput = z.object({
  businessId: z.string().uuid(),
  environment: z.enum(["simulation", "production"]),
  otp: z.string().regex(/^\d{6}$/),
  address: zatcaAddress,
});

async function getOwner(businessId: string) {
  const user = await getCurrentUserForApiWrite();
  const business = user && await getActiveBusinessForUser(user.id, "laundry");
  return user && business?.id === businessId && business.ownerId === user.id ? { id: user.id, industry: (business.businessCategory || business.businessType || "خدمات").trim().slice(0, 100) } : null;
}

export async function connectCashierZatca(value: unknown) {
  const parsed = connectInput.safeParse(value);
  if (!parsed.success) return { ok: false, message: "تحقق من العنوان الوطني والسجل التجاري ورمز التهيئة المكوّن من ستة أرقام." };
  const input = parsed.data;
  const owner = await getOwner(input.businessId);
  if (!owner) return { ok: false, message: "هذه العملية متاحة لمالك المنشأة النشطة." };
  const config = zatcaConfiguration();
  if (!config.configured || (input.environment === "production" && !config.production)) {
    return { ok: false, message: "بيئة الربط المختارة غير متاحة حاليًا." };
  }
  const profile = await cashierTaxProfile(input.businessId);
  if (!profile) return { ok: false, message: "احفظ اسم البائع ورقمه الضريبي أولًا." };
  const deviceId = randomUUID(), token = randomUUID();

  const started = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${input.businessId}`}))`;
    if (input.environment === "production") {
      const [simulation] = await tx.$queryRaw<Array<{ testedAt: Date | null }>>`
        SELECT "testedAt" FROM "CashierZatcaDevice" WHERE "businessId"=${input.businessId} AND environment='simulation' AND seller->>'vatNumber'=${profile.vatNumber}`;
      if (!simulation?.testedAt) return [];
    }
    return tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "CashierZatcaDevice" ("businessId", environment, id, seller, "onboardingToken", "leaseUntil")
      VALUES (${input.businessId},${input.environment},${deviceId},${JSON.stringify({ ...input.address, vatNumber: profile.vatNumber })}::jsonb,${token},now()+interval '3 minutes')
      ON CONFLICT ("businessId",environment) DO UPDATE SET id=EXCLUDED.id,seller=EXCLUDED.seller,
        "onboardingToken"=EXCLUDED."onboardingToken","leaseUntil"=EXCLUDED."leaseUntil",
        credentials=NULL,"expiresAt"=NULL,"testedAt"=NULL
      WHERE ("CashierZatcaDevice".credentials IS NULL OR EXCLUDED.environment='simulation')
        AND ("CashierZatcaDevice"."leaseUntil" IS NULL OR "CashierZatcaDevice"."leaseUntil" < now())
      RETURNING id`;
  });
  if (!started.length) return { ok: false, message: "تحقق من نجاح المحاكاة أولًا. قد يكون الجهاز مسجلًا أو التهيئة قيد التنفيذ." };

  try {
    const result = await onboardZatcaDevice({ ...input, profile, deviceId, industry: owner.industry });
    if (input.environment === "simulation") {
      const sample = await signZatcaInvoice(buildZatcaInvoice({
        profile, address: input.address, number: 1, counter: 1, previousHash: null, issuedAt: new Date(),
        gross: 11500, vat: 1500, lines: [{ name: "خدمة تجريبية في المحاكاة", quantity: 1, gross: 11500 }],
      }), result.credentials);
      await reportZatcaInvoice(sample, result.credentials, "simulation");
    }
    const finalized = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${input.businessId}`}))`;
      const [owned] = await tx.$queryRaw<Array<{ id: string }>>`SELECT b.id FROM "Business" b JOIN "CashierTaxProfile" p
        ON p."businessId"=b.id WHERE b.id=${input.businessId} AND b."ownerId"=${owner.id} AND b."deletedAt" IS NULL
        AND (p."sellerName",p."sellerAddress",p."vatNumber")=(${profile.sellerName},${profile.sellerAddress},${profile.vatNumber})`;
      if (!owned) return 0;
      return tx.$executeRaw`UPDATE "CashierZatcaDevice" SET credentials=${JSON.stringify(sealZatcaCredentials(input.businessId,deviceId,result.credentials))}::jsonb,
        "expiresAt"=${result.expiresAt},"testedAt"=now(),"onboardingToken"=NULL,"leaseUntil"=NULL
        WHERE "businessId"=${input.businessId} AND id=${deviceId} AND "onboardingToken"=${token}`;
    });
    if (finalized !== 1) return { ok: false, message: "تغيّرت بيانات المنشأة أثناء التهيئة. تحقق من حالة الجهاز في بوابة فاتورة." };
    revalidatePath("/Accounting");
    revalidatePath("/Laundromat");
    return { ok: true, message: input.environment === "simulation" ? "قبلت منصة المحاكاة الفاتورة التجريبية." : "تم تسجيل جهاز الإصدار. فعّل الإصدار من الإعدادات بعد التحقق." };
  } catch (error) {
    const code = error instanceof ZatcaGatewayError ? error.code : "DEVICE_CONFIGURATION";
    return { ok: false, message: `تعذرت تهيئة الجهاز أو قبول الفاتورة التجريبية. رمز الحالة: ${code}` };
  } finally {
    await db.$executeRaw`UPDATE "CashierZatcaDevice" SET "onboardingToken"=NULL,"leaseUntil"=NULL
      WHERE "businessId"=${input.businessId} AND id=${deviceId} AND "onboardingToken"=${token}`;
  }
}

export async function activateCashierZatca(value: unknown) {
  const parsed = z.object({ businessId: z.string().uuid(), confirmed: z.literal(true) }).safeParse(value);
  const owner = parsed.success ? await getOwner(parsed.data.businessId) : null;
  if (!parsed.success || !owner) return { ok: false, message: "يلزم تأكيد مالك المنشأة النشطة." };
  const { businessId } = parsed.data;
  const config = zatcaConfiguration();
  if (!config.configured || !config.production) return { ok: false, message: "بيئة الإنتاج غير متاحة حاليًا." };
  try {
    const changed = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${businessId}`}))`;
      const [owned] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Business" WHERE id=${businessId} AND "ownerId"=${owner.id} AND "deletedAt" IS NULL`;
      if (!owned || !await cashierTaxProfile(businessId, tx)) return 0;
      await ensureCashierOutputVatAccount(tx, businessId);
      const updated = await tx.$executeRaw`UPDATE "CashierZatcaDevice" SET active=TRUE WHERE "businessId"=${businessId}
        AND environment='production' AND "testedAt" IS NOT NULL AND credentials IS NOT NULL AND "expiresAt">now()`;
      if (updated) await tx.$executeRaw`UPDATE "CashierTaxProfile" SET enabled=TRUE WHERE "businessId"=${businessId}`;
      return updated;
    });
    revalidatePath("/Accounting");
    revalidatePath("/Laundromat");
    return changed ? { ok: true, message: "تفعّل إصدار المرحلة الثانية." }
      : { ok: false, message: "تحقق من تسجيل جهاز إنتاج صالح وحفظ بيانات البائع أولًا." };
  } catch {
    return { ok: false, message: "تعذر التفعيل. تأكد من تهيئة دفتر المحاسبة وحساب ضريبة المبيعات." };
  }
}
