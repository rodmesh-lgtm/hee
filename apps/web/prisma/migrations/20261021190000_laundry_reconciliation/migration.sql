BEGIN;
CREATE TABLE "LaundryReconciliation" (
 id TEXT PRIMARY KEY,
 "businessId" TEXT NOT NULL,
 "accountCode" TEXT NOT NULL,
 "statementDate" DATE NOT NULL,
 reference TEXT NOT NULL,
 "statementBalance" BIGINT NOT NULL,
 "bookBalance" BIGINT NOT NULL,
 outstanding BIGINT NOT NULL,
 snapshot JSONB NOT NULL,
 "createdBy" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK ("bookBalance" = "statementBalance" + outstanding),
 UNIQUE ("businessId", id),
 UNIQUE ("businessId", "accountCode", "statementDate"),
 FOREIGN KEY ("businessId", "accountCode") REFERENCES "LaundryAccount" ("businessId", code) ON DELETE RESTRICT
);
ALTER TABLE "LaundryJournalLine" ADD CONSTRAINT "LaundryJournalLine_business_id_unique" UNIQUE ("businessId", id);
CREATE TABLE "LaundryReconciledLine" (
 "lineId" TEXT PRIMARY KEY,
 "businessId" TEXT NOT NULL,
 "reconciliationId" TEXT NOT NULL,
 FOREIGN KEY ("businessId", "reconciliationId") REFERENCES "LaundryReconciliation" ("businessId", id) ON DELETE RESTRICT,
 FOREIGN KEY ("businessId", "lineId") REFERENCES "LaundryJournalLine" ("businessId", id) ON DELETE RESTRICT
);
CREATE TRIGGER laundry_reconciliation_immutable BEFORE UPDATE OR DELETE ON "LaundryReconciliation" FOR EACH ROW EXECUTE FUNCTION reject_laundry_journal_update();
CREATE TRIGGER laundry_reconciled_line_immutable BEFORE UPDATE OR DELETE ON "LaundryReconciledLine" FOR EACH ROW EXECUTE FUNCTION reject_laundry_journal_update();
COMMIT;
