import "server-only";
import type { Prisma } from "@prisma/client";
import { LaundryInputError } from "./laundry-domain";
import { laundryReportRange } from "./laundry-report";
import { laundryReconciliation } from "./laundry-reconciliation-domain";

export type BankLine = { id: string; number: number; description: string; effectiveAt: string; debit: number; credit: number };
export type BankView = { balance: number; lines: BankLine[]; locked: boolean; latestDate: string | null };
export async function readLaundryBank(tx: Prisma.TransactionClient, businessId: string, accountCode: string, date: string): Promise<BankView> {
  const { end } = laundryReportRange(date, date);
  if (end > new Date()) throw new LaundryInputError("اختر يومًا سابقًا مكتملًا للمطابقة");
  const books = await tx.$queryRaw<Array<{ initializedAt: Date | null; lockedBefore: Date | null }>>`SELECT "initializedAt", "lockedBefore" FROM "LaundryBook" WHERE "businessId"=${businessId}`;
  if (!books[0]?.initializedAt) throw new LaundryInputError("أكمل تهيئة دفتر المحاسبة أولًا");
  const accounts = await tx.$queryRaw<Array<{ code: string }>>`SELECT code FROM "LaundryAccount" WHERE "businessId"=${businessId} AND code=${accountCode} AND kind='asset'`;
  if (!accounts.length) throw new LaundryInputError("الحساب غير موجود في دفتر المنشأة");
  const latest = await tx.$queryRaw<Array<{ date: string }>>`SELECT "statementDate"::text AS date FROM "LaundryReconciliation" WHERE "businessId"=${businessId} AND "accountCode"=${accountCode} ORDER BY "statementDate" DESC LIMIT 1`;
  if (latest[0] && date <= latest[0].date) throw new LaundryInputError("اختر تاريخًا بعد آخر مطابقة معتمدة لهذا الحساب");
  const totals = await tx.$queryRaw<Array<{ balance: number }>>`SELECT COALESCE(SUM(l.debit-l.credit),0)::float8 AS balance FROM "LaundryJournalLine" l JOIN "LaundryJournal" j ON j."businessId"=l."businessId" AND j.id=l."journalId" WHERE l."businessId"=${businessId} AND l."accountCode"=${accountCode} AND j."effectiveAt"<${end}`;
  const lines = await tx.$queryRaw<Array<Omit<BankLine, "effectiveAt"> & { effectiveAt: Date }>>`SELECT l.id,j.number,j.description,j."effectiveAt",l.debit::float8,l.credit::float8 FROM "LaundryJournalLine" l JOIN "LaundryJournal" j ON j."businessId"=l."businessId" AND j.id=l."journalId" WHERE l."businessId"=${businessId} AND l."accountCode"=${accountCode} AND j."effectiveAt"<${end} AND NOT EXISTS(SELECT 1 FROM "LaundryReconciledLine" r WHERE r."businessId"=l."businessId" AND r."lineId"=l.id) ORDER BY j."effectiveAt",j.number,l.id LIMIT 2001`;
  if (lines.length > 2000) throw new LaundryInputError("تجاوزت الحركات غير المطابقة 2000 حركة؛ طابق كشفًا بتاريخ أقدم أولًا");
  return { balance: totals[0].balance, lines: lines.map(l => ({ ...l, effectiveAt: l.effectiveAt.toISOString() })), locked: !!books[0].lockedBefore && books[0].lockedBefore >= end, latestDate: latest[0]?.date ?? null };
}

// Caller serializes ledger writes with the same business advisory lock.
export async function saveLaundryBank(tx: Prisma.TransactionClient, input: { businessId: string; actorId: string; requestId: string; accountCode: string; date: string; reference: string; statementBalance: number; outstandingIds: string[] }) {
  const old = await tx.$queryRaw<Array<{ accountCode: string; date: string; reference: string; statementBalance: number; snapshot: { outstandingIds: string[] } }>>`SELECT "accountCode","statementDate"::text AS date,reference,"statementBalance"::float8,snapshot FROM "LaundryReconciliation" WHERE "businessId"=${input.businessId} AND id=${input.requestId}`;
  if (old[0]) {
    const r = old[0];
    if (r.accountCode !== input.accountCode || r.date !== input.date || r.reference !== input.reference || r.statementBalance !== input.statementBalance || JSON.stringify([...r.snapshot.outstandingIds].sort()) !== JSON.stringify([...input.outstandingIds].sort()))
      throw new LaundryInputError("حُفظت المطابقة السابقة بهذا المعرّف؛ أعد تحميل الكشف قبل إدخال مطابقة أخرى");
    return;
  }
  const view = await readLaundryBank(tx, input.businessId, input.accountCode, input.date);
  if (!view.locked) throw new LaundryInputError("أقفل الفترة حتى تاريخ الكشف من دفتر المحاسبة قبل اعتماد المطابقة");
  const result = laundryReconciliation({ bookBalance: view.balance, statementBalance: input.statementBalance, lines: view.lines, outstandingIds: input.outstandingIds });
  if (result.difference !== 0) throw new LaundryInputError("يوجد فرق في المطابقة؛ راجع الكشف وسجّل العمليات الناقصة قبل الاعتماد");
  await tx.$executeRaw`INSERT INTO "LaundryReconciliation" (id,"businessId","accountCode","statementDate",reference,"statementBalance","bookBalance",outstanding,snapshot,"createdBy") VALUES (${input.requestId},${input.businessId},${input.accountCode},${input.date}::date,${input.reference},${input.statementBalance},${view.balance},${result.outstanding},${JSON.stringify({ lines: view.lines, outstandingIds: input.outstandingIds })}::jsonb,${input.actorId})`;
  if (result.matchedIds.length) await tx.$executeRaw`INSERT INTO "LaundryReconciledLine" ("lineId","businessId","reconciliationId") SELECT value,${input.businessId},${input.requestId} FROM jsonb_array_elements_text(${JSON.stringify(result.matchedIds)}::jsonb)`;
  await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${input.requestId},${input.businessId},${input.actorId},'bank-reconcile',${input.requestId})`;
}
