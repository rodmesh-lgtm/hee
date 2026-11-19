"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getCurrentUserForApiWrite } from "../lib/auth";
import { db } from "../lib/db";
import { cashierTaxProfile, ensureCashierOutputVatAccount } from "../lib/cashier-tax-server";
import { buildZatcaInvoice, prepareStandardZatcaInvoice, signZatcaInvoice, zatcaAddress, zatcaBuyerWithSupplyDate } from "../lib/cashier-zatca-document";
import { clearZatcaInvoice, onboardZatcaDevice, reportZatcaInvoice, renewZatcaProductionDevice, standardZatcaSampleBuyer, ZatcaGatewayError } from "../lib/cashier-zatca-gateway";
import { LaundryInputError } from "../lib/laundry-domain";
import type { CommerceCredentialEnvelope } from "../lib/whatsapp/commerce-credential-envelope";
import { openZatcaCredentials, reissueRejectedZatcaDocument, sealZatcaCredentials, zatcaConfiguration } from "../lib/cashier-zatca-server";

const scope = z.enum(["simplified", "standard"]).default("simplified");

const connectInput = z.object({
  businessId: z.string().uuid(),
  environment: z.enum(["simulation", "production"]),
  scope,
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
        SELECT "testedAt" FROM "CashierZatcaDevice" WHERE "businessId"=${input.businessId} AND environment='simulation' AND scope=${input.scope} AND seller->>'vatNumber'=${profile.vatNumber}`;
      if (!simulation?.testedAt) return [];
    }
    return tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "CashierZatcaDevice" ("businessId", environment, scope, id, seller, "onboardingToken", "leaseUntil")
      VALUES (${input.businessId},${input.environment},${input.scope},${deviceId},${JSON.stringify({ ...input.address, vatNumber: profile.vatNumber })}::jsonb,${token},now()+interval '3 minutes')
      ON CONFLICT ("businessId",environment,scope) DO UPDATE SET id=EXCLUDED.id,seller=EXCLUDED.seller,
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
      const document = buildZatcaInvoice({
        profile, address: input.address, number: 1, counter: 1, previousHash: null, issuedAt: new Date(),
        buyer: input.scope === "standard" ? standardZatcaSampleBuyer : undefined, supplyDate: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Riyadh" }).format(new Date()),
        gross: 11500, vat: 1500, lines: [{ name: "خدمة تجريبية في المحاكاة", quantity: 1, gross: 11500 }],
      });
      if (input.scope === "standard") {
        await clearZatcaInvoice(await prepareStandardZatcaInvoice(document), result.credentials, "simulation");
      } else {
        await reportZatcaInvoice(await signZatcaInvoice(document, result.credentials), result.credentials, "simulation");
      }
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
  const parsed = z.object({ businessId: z.string().uuid(), confirmed: z.literal(true), scope }).safeParse(value);
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
        AND environment='production' AND scope=${parsed.data.scope} AND "testedAt" IS NOT NULL AND credentials IS NOT NULL AND "expiresAt">now() AND "renewalToken" IS NULL`;
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

const reissueInput = z.object({
  businessId: z.string().uuid(),
  number: z.number().int().min(1).max(2147483647),
  expectedUuid: z.string().uuid(),
  correction: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("invoice"), buyer: zatcaBuyerWithSupplyDate }),
    z.object({ kind: z.literal("credit"), reason: z.string().trim().min(4).max(300).regex(/^[^\u0000-\u001f\u007f]+$/u) }),
  ]),
});

export async function reissueCashierZatca(value: unknown) {
  const parsed = reissueInput.safeParse(value);
  if (!parsed.success) return { ok: false, message: "تحقق من البيانات المصححة للمستند." };
  const { businessId } = parsed.data;
  const owner = await getOwner(businessId);
  if (!owner) return { ok: false, message: "تصحيح مستندات زاتكا متاح لمالك المنشأة النشطة." };
  try {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${businessId}`}))`;
      const [owned] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Business" WHERE id=${businessId} AND "ownerId"=${owner.id} AND "deletedAt" IS NULL FOR SHARE`;
      if (!owned) throw new LaundryInputError("تغيّر مالك المنشأة. حدّث الصفحة.");
      await reissueRejectedZatcaDocument(tx, { ...parsed.data, actorId: owner.id });
    });
    revalidatePath("/Accounting");
    revalidatePath("/Laundromat");
    return { ok: true, message: "حُفظ التصحيح وأُدرج المستند الجديد للاعتماد." };
  } catch (error) {
    return { ok: false, message: error instanceof LaundryInputError ? error.message : "تعذر تصحيح المستند. حدّث حالته وحاول مرة أخرى." };
  }
}

export async function renewCashierZatca(value: unknown) {
  const input = z.object({ businessId: z.string().uuid(), scope, otp: z.string().regex(/^\d{6}$/) }).safeParse(value);
  const owner = input.success ? await getOwner(input.data.businessId) : null;
  if (!input.success || !owner) return { ok: false, message: "أدخل رمز التجديد من حساب مالك المنشأة النشطة." };
  const { businessId, otp } = input.data;
  const config = zatcaConfiguration();
  if (!config.configured || !config.production) return { ok: false, message: "بيئة الربط غير متاحة للتجديد حاليًا." };

  const token = randomUUID();
  const reservation = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${businessId}`}))`;
    const [device] = await tx.$queryRaw<Array<{ id: string; seller: unknown; credentials: CommerceCredentialEnvelope }>>`
      SELECT d.id,d.seller,d.credentials FROM "CashierZatcaDevice" d JOIN "Business" b ON b.id=d."businessId"
      WHERE b.id=${businessId} AND b."ownerId"=${owner.id} AND b."deletedAt" IS NULL
        AND d.environment='production' AND d.scope=${input.data.scope} AND d.credentials IS NOT NULL
        AND d."renewalToken" IS NULL AND d."expiresAt">now()
        AND NOT EXISTS (SELECT 1 FROM "CashierZatcaReport" r WHERE r."businessId"=d."businessId"
          AND r."deviceId"=d.id AND r.status='pending') FOR UPDATE OF d`;
    const profile = device ? await cashierTaxProfile(businessId, tx) : null;
    const address = device ? zatcaAddress.safeParse(device.seller) : null;
    if (!device || !profile || !address?.success) return null;
    const credentials = openZatcaCredentials(businessId, device.id, device.credentials);
    await tx.$executeRaw`UPDATE "CashierZatcaDevice" SET "renewalToken"=${token}
      WHERE "businessId"=${businessId} AND id=${device.id}`;
    return { deviceId: device.id, address: address.data, profile, credentials };
  }).catch(() => null);
  if (!reservation) return { ok: false, message: "تحقق من صلاحية الشهادة وعدم وجود مستندات قيد الإرسال أو طلب تجديد معلّق." };

  try {
    const renewed = await renewZatcaProductionDevice({ ...reservation, scope: input.data.scope, industry: owner.industry, otp });
    const encrypted = JSON.stringify(sealZatcaCredentials(businessId, reservation.deviceId, renewed.credentials));
    const updated = await db.$executeRaw`UPDATE "CashierZatcaDevice" SET credentials=${encrypted}::jsonb,
      "expiresAt"=${renewed.expiresAt},"renewalToken"=NULL
      WHERE "businessId"=${businessId} AND id=${reservation.deviceId} AND "renewalToken"=${token}`;
    if (updated !== 1) throw new Error("DEVICE_RENEWAL_STATE_CHANGED");
    return { ok: true, message: "جُدّدت شهادة جهاز الإصدار." };
  } catch (error) {
    if (error instanceof ZatcaGatewayError && [400, 401, 403, 422].includes(error.status)) {
      await db.$executeRaw`UPDATE "CashierZatcaDevice" SET "renewalToken"=NULL
        WHERE "businessId"=${businessId} AND id=${reservation.deviceId} AND "renewalToken"=${token}`;
      return { ok: false, message: `رفضت زاتكا التجديد. راجع الرمز وحالة الشهادة في فاتورة. ${error.code}` };
    }
    return { ok: false, message: "لم تتأكد نتيجة التجديد. راجع حالة الشهادة في بوابة فاتورة قبل استئناف الإصدار." };
  } finally {
    revalidatePath("/Accounting");
    revalidatePath("/Laundromat");
  }
}
