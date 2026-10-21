import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../app/lib/db";
import { closePrismaForWorker } from "../lib/prisma";
import { postLaundryJournal } from "../app/lib/laundry-ledger";
import { LAUNDRY_ACCOUNTS } from "../app/lib/laundry-ledger-domain";
import { readLaundryBank, saveLaundryBank } from "../app/lib/laundry-reconciliation";
if (process.env.APP_ENV !== "test" || process.env.ALLOW_LAUNDRY_RECONCILIATION_AUDIT !== "true") throw new Error("Disposable test runtime required");
async function main() {
  const user = await db.user.create({ data: { name: "Bank audit", email: `${randomUUID()}@example.invalid` } });
  const b = await db.business.create({ data: { ownerId: user.id, name: "Bank audit", slug: randomUUID(), businessType: "audit" } });
  const other = await db.business.create({ data: { ownerId: user.id, name: "Other audit", slug: randomUUID(), businessType: "audit" } });
  try {
    for (const businessId of [b.id, other.id]) {
      await db.$executeRaw`INSERT INTO "LaundryBook" ("businessId","createdBy","initializedAt") VALUES (${businessId},${user.id},now())`;
      await db.$executeRaw`INSERT INTO "LaundryAccount" ("businessId",code,name,kind) SELECT ${businessId},a.code,a.name,a.kind FROM jsonb_to_recordset(${JSON.stringify(LAUNDRY_ACCOUNTS)}::jsonb) AS a(code text,name text,kind text)`;
    }
    for (const [index, amount] of [10000, 3000].entries()) {
      await db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
        await postLaundryJournal(tx, { businessId: b.id, actorId: user.id, sourceKey: `manual:${randomUUID()}`, effectiveAt: new Date("2026-01-01T10:00:00Z"), description: `audit ${index}`, lines: index === 0 ? [{ accountCode: "1120", debit: amount, credit: 0 }, { accountCode: "3000", debit: 0, credit: amount }] : [{ accountCode: "5000", debit: amount, credit: 0 }, { accountCode: "1120", debit: 0, credit: amount }] });
      });
    }
    const view = await db.$transaction(tx => readLaundryBank(tx, b.id, "1120", "2026-01-02"));
    assert.equal(view.balance, 7000); assert.equal(view.locked, false); assert.equal(view.lines.length, 2);
    const input = { businessId: b.id, actorId: user.id, requestId: randomUUID(), accountCode: "1120", date: "2026-01-02", reference: "bank statement", statementBalance: 10000, outstandingIds: [view.lines.find(l => l.credit > 0)!.id] };
    const save = (value = input) => db.$transaction(async tx => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${value.businessId}`}))`; await saveLaundryBank(tx, value); });
    await assert.rejects(save(), /أقفل/);
    await db.$executeRaw`UPDATE "LaundryBook" SET "lockedBefore"='2026-01-05T21:00:00Z'::timestamptz WHERE "businessId" IN (${b.id},${other.id})`;
    await assert.rejects(save({ ...input, statementBalance: 9999 }), /فرق/);
    await assert.rejects(save({ ...input, outstandingIds: [randomUUID()] }), /تغيرت/);
    await assert.rejects(save({ ...input, businessId: other.id }), /تغيرت/);
    await save(); await save();
    await assert.rejects(save({ ...input, reference: "changed" }), /معرّف/);
    const saved = await db.$queryRaw<Array<{ n: number }>>`SELECT COUNT(*)::int AS n FROM "LaundryReconciliation" WHERE "businessId"=${b.id}`;
    assert.equal(saved[0].n, 1);
    await assert.rejects(db.$executeRaw`UPDATE "LaundryReconciliation" SET reference='tampered' WHERE id=${input.requestId}`);
    await assert.rejects(db.$executeRaw`DELETE FROM "LaundryReconciliation" WHERE id=${input.requestId}`);
    const next = await db.$transaction(tx => readLaundryBank(tx, b.id, "1120", "2026-01-03"));
    assert.equal(next.lines.length, 1); assert.equal(next.balance, 7000); assert.equal(next.lines[0].credit, 3000);
    await save({ ...input, requestId: randomUUID(), date: "2026-01-03", statementBalance: 7000, outstandingIds: [] });
    await assert.rejects(save({ ...input, requestId: randomUUID() }), /بعد آخر/);
    const final = await db.$transaction(tx => readLaundryBank(tx, b.id, "1120", "2026-01-04"));
    assert.equal(final.lines.length, 0); assert.equal(final.balance, 7000);
    await assert.rejects(db.$executeRaw`INSERT INTO "LaundryReconciledLine" ("lineId","businessId","reconciliationId") VALUES (${randomUUID()},${other.id},${input.requestId})`);
    console.log("laundry-reconciliation: PASS balanced reconciliation, locked periods, tenant isolation, immutable snapshots, retry deduplication, outstanding carry-forward");
  } finally {
    await db.business.updateMany({ where: { id: { in: [b.id, other.id] } }, data: { deletedAt: new Date() } });
    await db.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(closePrismaForWorker);
