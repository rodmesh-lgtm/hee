"use server";
import { z } from "zod";
import { db } from "../lib/db";
import { getCurrentUser, getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { LaundryInputError } from "../lib/laundry-domain";
import { laundryBankBalance } from "../lib/laundry-reconciliation-domain";
import { readLaundryBank, saveLaundryBank, type BankView } from "../lib/laundry-reconciliation";
import { revalidatePath } from "next/cache";

const scope = z.object({ businessId: z.string().uuid(), accountCode: z.enum(["1110", "1120"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export async function getLaundryBank(value: unknown): Promise<{ ok: true; view: BankView } | { ok: false; error: string }> {
  const p = scope.safeParse(value);
  if (!p.success) return { ok: false, error: "حدد الحساب وتاريخ كشف البنك" };
  const user = await getCurrentUser();
  const b = user ? await getActiveBusinessForUser(user.id, "laundryAccounting") : null;
  if (!b || b.id !== p.data.businessId) return { ok: false, error: "المطابقة تتطلب صلاحية محاسبة المنشأة النشطة" };
  try {
    const view = await db.$transaction(tx => readLaundryBank(tx, b.id, p.data.accountCode, p.data.date), { isolationLevel: "RepeatableRead", timeout: 15000 });
    return { ok: true, view };
  } catch (e) { return { ok: false, error: e instanceof LaundryInputError ? e.message : "تعذر قراءة كشف المطابقة" }; }
}
export async function confirmLaundryBank(value: unknown): Promise<{ ok: boolean; error?: string }> {
  const p = scope.extend({ requestId: z.string().uuid(), reference: z.string().trim().min(2).max(120), statementBalance: z.string().max(30), outstandingIds: z.array(z.string().uuid()).max(2000) }).safeParse(value);
  if (!p.success) return { ok: false, error: "راجع مرجع الكشف ورصيده وحركات المطابقة" };
  const user = await getCurrentUserForApiWrite();
  const b = user ? await getActiveBusinessForUser(user.id, "laundryAccounting") : null;
  if (!user || !b || b.id !== p.data.businessId) return { ok: false, error: "المطابقة تتطلب صلاحية محاسبة المنشأة النشطة" };
  try {
    const statementBalance = laundryBankBalance(p.data.statementBalance);
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
      await saveLaundryBank(tx, { ...p.data, businessId: b.id, actorId: user.id, statementBalance });
    }, { timeout: 15000 });
    revalidatePath("/Laundromat");
    revalidatePath("/Laundromat/Accounting");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof LaundryInputError ? e.message : "تعذر اعتماد المطابقة؛ أعد المحاولة بنفس البيانات" }; }
}
export type BankHistoryRow = { id: string; accountCode: string; statementDate: string; reference: string; statementBalance: number; bookBalance: number; outstanding: number; createdAt: string; snapshot: { lines: BankView["lines"]; outstandingIds: string[] } };
export async function getLaundryBankHistory(value: unknown): Promise<{ ok: true; rows: BankHistoryRow[] } | { ok: false; error: string }> {
  const p = z.object({ businessId: z.string().uuid() }).safeParse(value);
  const user = await getCurrentUser();
  const b = user ? await getActiveBusinessForUser(user.id, "laundryAccounting") : null;
  if (!p.success || !b || b.id !== p.data.businessId) return { ok: false, error: "سجل المطابقة يتطلب صلاحية محاسبة المنشأة النشطة" };
  try {
    const rows = await db.$queryRaw<Array<Omit<BankHistoryRow, "createdAt"> & { createdAt: Date }>>`SELECT id,"accountCode","statementDate"::text,reference,"statementBalance"::float8,"bookBalance"::float8,outstanding::float8,"createdAt",snapshot FROM "LaundryReconciliation" WHERE "businessId"=${b.id} ORDER BY "statementDate" DESC,"createdAt" DESC LIMIT 50`;
    return { ok: true, rows: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })) };
  } catch { return { ok: false, error: "تعذر قراءة سجل المطابقات" }; }
}
