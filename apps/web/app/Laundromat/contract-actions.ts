"use server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUser, getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { LaundryInputError, moneyToHalalas } from "../lib/laundry-domain";
import { ensureLaundryCustomer } from "../lib/laundry-customer";
import { laundrySignatureSchema, validateLaundrySignature, validateLaundryContractDates, type LaundryContractRow } from "../lib/laundry-contract-domain";

const uuid = z.string().uuid();
const commands = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), reference: z.string().trim().min(2).max(80), title: z.string().trim().min(4).max(150), customerName: z.string().trim().min(2).max(100), customerPhone: z.string().max(40), startsOn: z.string().max(10), endsOn: z.string().max(10), amount: z.string().max(20), terms: z.string().trim().min(20).max(12000) }),
  z.object({ type: z.literal("sign"), id: uuid, digest: z.string().regex(/^[a-f0-9]{64}$/), signerName: z.string().trim().min(2).max(100), consent: z.literal(true), signature: laundrySignatureSchema }),
  z.object({ type: z.literal("cancel"), id: uuid, reason: z.string().trim().min(4).max(500) }),
]);
export async function laundryContractCommand(value: unknown): Promise<{ ok: boolean; error?: string }> {
  const scope = z.object({ businessId: uuid, requestId: uuid }).safeParse(value), p = commands.safeParse(value);
  if (!scope.success || !p.success) return { ok: false, error: "راجع بيانات العقد والتوقيع والموافقة" };
  const user = await getCurrentUserForApiWrite();
  const b = user ? await getActiveBusinessForUser(user.id, "laundryAccounting") : null;
  if (!user || !b || b.id !== scope.data.businessId) return { ok: false, error: "العقود تتطلب صلاحية محاسبة المنشأة النشطة" };
  const d = p.data;
  try {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
      const old = await tx.$queryRaw<Array<{ action: string; targetId: string }>>`SELECT action,"targetId" FROM "LaundryAudit" WHERE "businessId"=${b.id} AND id=${scope.data.requestId}`;
      if (old[0]) { if (old[0].action !== `contract-${d.type}` || (d.type !== "create" && old[0].targetId !== d.id)) throw new LaundryInputError("معرّف العملية مستخدم"); return; }
      let target = scope.data.requestId;
      if (d.type === "create") {
        validateLaundryContractDates(d.startsOn, d.endsOn);
        const amount = moneyToHalalas(d.amount); if (!amount) throw new LaundryInputError("أدخل القيمة التعاقدية الإجمالية");
        const duplicate = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "LaundryContract" WHERE "businessId"=${b.id} AND reference=${d.reference}`;
        if (duplicate.length) throw new LaundryInputError("مرجع العقد مستخدم؛ اختر مرجعًا جديدًا");
        const customer = await ensureLaundryCustomer(tx, b.id, d.customerName, d.customerPhone);
        const digest = createHash("sha256").update(JSON.stringify({ version: 1, businessId: b.id, businessName: b.name, id: target, reference: d.reference, customerName: d.customerName, customerPhone: customer.phone, title: d.title, terms: d.terms, startsOn: d.startsOn, endsOn: d.endsOn, amount })).digest("hex");
        await tx.$executeRaw`INSERT INTO "LaundryContract" (id,"businessId","customerId",number,reference,"customerName","customerPhone","businessName",title,terms,"startsOn","endsOn",amount,digest,"createdBy") SELECT ${target},${b.id},${customer.id},COALESCE(MAX(number),0)+1,${d.reference},${d.customerName},${customer.phone},${b.name},${d.title},${d.terms},${d.startsOn}::date,${d.endsOn}::date,${amount},${digest},${user.id} FROM "LaundryContract" WHERE "businessId"=${b.id}`;
      } else {
        target = d.id;
        const rows = await tx.$queryRaw<Array<{ status: string; digest: string }>>`SELECT status,digest FROM "LaundryContract" WHERE "businessId"=${b.id} AND id=${d.id}`;
        const contract = rows[0];
        if (!contract || contract.status === "cancelled") throw new LaundryInputError("العقد غير موجود أو ملغى في المنشأة");
        if (d.type === "sign") {
          if (contract.status !== "draft" || d.digest !== contract.digest) throw new LaundryInputError("العقد موقّع أو تغيرت نسخته؛ أعد فتح النسخة الحالية");
          const signature = validateLaundrySignature(d.signature);
          await tx.$executeRaw`UPDATE "LaundryContract" SET status='signed',"signedAt"=now(),"signerName"=${d.signerName},signature=${JSON.stringify(signature)}::jsonb,"witnessId"=${user.id} WHERE "businessId"=${b.id} AND id=${d.id}`;
        } else {
          await tx.$executeRaw`UPDATE "LaundryContract" SET status='cancelled',"cancelledAt"=now(),"cancelReason"=${d.reason} WHERE "businessId"=${b.id} AND id=${d.id}`;
        }
      }
      await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${scope.data.requestId},${b.id},${user.id},${`contract-${d.type}`},${target})`;
    }, { timeout: 15000 });
    revalidatePath("/Laundromat"); revalidatePath("/Laundromat/Accounting"); return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof LaundryInputError ? e.message : "تعذر حفظ العقد؛ أعد المحاولة بنفس البيانات" }; }
}
export async function getLaundryContracts(value: unknown): Promise<{ ok: true; rows: LaundryContractRow[] } | { ok: false; error: string }> {
  const p = z.object({ businessId: uuid, query: z.string().trim().max(100), status: z.enum(["all", "draft", "signed", "cancelled"]) }).safeParse(value);
  const user = await getCurrentUser(); const b = user ? await getActiveBusinessForUser(user.id, "laundryAccounting") : null;
  if (!p.success || !b || b.id !== p.data.businessId) return { ok: false, error: "العقود تتطلب صلاحية محاسبة المنشأة النشطة" };
  try {
    const rows = await db.$queryRaw<Array<Omit<LaundryContractRow, "createdAt" | "signedAt" | "cancelledAt"> & { createdAt: Date; signedAt: Date | null; cancelledAt: Date | null }>>`SELECT id,number,reference,"customerName","customerPhone","businessName",title,terms,"startsOn"::text,"endsOn"::text,amount::float8,status,digest,"createdAt","signedAt","signerName",signature,"cancelledAt","cancelReason" FROM "LaundryContract" WHERE "businessId"=${b.id} AND (${p.data.status}='all' OR status=${p.data.status}) AND (${p.data.query}='' OR POSITION(${p.data.query} IN reference)>0 OR POSITION(${p.data.query} IN "customerName")>0 OR POSITION(${p.data.query} IN title)>0) ORDER BY number DESC LIMIT 100`;
    return { ok: true, rows: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), signedAt: r.signedAt?.toISOString() ?? null, cancelledAt: r.cancelledAt?.toISOString() ?? null })) };
  } catch { return { ok: false, error: "تعذر قراءة العقود" }; }
}
