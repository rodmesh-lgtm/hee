-- Ledger is opt-in per business. Existing source transactions are never rewritten.
CREATE TABLE "LaundryBook" (
 "businessId" TEXT PRIMARY KEY REFERENCES "Business"("id") ON DELETE RESTRICT,
 "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "lockedBefore" TIMESTAMPTZ
);
CREATE TABLE "LaundryAccount" (
 "businessId" TEXT NOT NULL REFERENCES "LaundryBook"("businessId") ON DELETE RESTRICT,
 "code" TEXT NOT NULL, "name" TEXT NOT NULL,
 "kind" TEXT NOT NULL CHECK("kind" IN ('asset','liability','equity','income','expense')),
 PRIMARY KEY("businessId","code")
);
CREATE TABLE "LaundryJournal" (
 "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "LaundryBook"("businessId") ON DELETE RESTRICT,
 "number" INTEGER NOT NULL CHECK("number">0), "sourceKey" TEXT NOT NULL,
 "description" TEXT NOT NULL, "effectiveAt" TIMESTAMPTZ NOT NULL,
 "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "reversalOf" TEXT,
 UNIQUE("businessId","id"), UNIQUE("businessId","number"), UNIQUE("businessId","sourceKey"),
 FOREIGN KEY("businessId","reversalOf") REFERENCES "LaundryJournal"("businessId","id") ON DELETE RESTRICT
);
CREATE TABLE "LaundryJournalLine" (
 "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL, "journalId" TEXT NOT NULL, "accountCode" TEXT NOT NULL,
 "debit" BIGINT NOT NULL DEFAULT 0, "credit" BIGINT NOT NULL DEFAULT 0,
 CHECK(("debit">0 AND "credit"=0) OR ("credit">0 AND "debit"=0)),
 CHECK("debit"<=1000000000000 AND "credit"<=1000000000000),
 FOREIGN KEY("businessId","journalId") REFERENCES "LaundryJournal"("businessId","id") ON DELETE RESTRICT,
 FOREIGN KEY("businessId","accountCode") REFERENCES "LaundryAccount"("businessId","code") ON DELETE RESTRICT
);
CREATE INDEX "LaundryJournal_business_date" ON "LaundryJournal"("businessId","effectiveAt","id");
CREATE INDEX "LaundryJournalLine_account" ON "LaundryJournalLine"("businessId","accountCode");
-- Deferred check sees all lines of the atomic transaction, including manual journals.
CREATE FUNCTION check_laundry_journal_balance() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE jid TEXT; bid TEXT; n BIGINT; d NUMERIC; c NUMERIC;
BEGIN
 IF TG_TABLE_NAME='LaundryJournal' THEN jid=NEW."id"; bid=NEW."businessId";
 ELSE jid=COALESCE(NEW."journalId",OLD."journalId");bid=COALESCE(NEW."businessId",OLD."businessId");END IF;
 IF NOT EXISTS(SELECT 1 FROM "LaundryJournal" WHERE "id"=jid AND "businessId"=bid) THEN RETURN NULL;END IF;
 SELECT COUNT(*),COALESCE(SUM("debit"),0),COALESCE(SUM("credit"),0) INTO n,d,c FROM "LaundryJournalLine" WHERE "journalId"=jid AND "businessId"=bid;
 IF n<2 OR d<>c OR d=0 THEN RAISE EXCEPTION 'LAUNDRY_JOURNAL_UNBALANCED';END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER laundry_journal_header_balance AFTER INSERT OR UPDATE ON "LaundryJournal" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_laundry_journal_balance();
CREATE CONSTRAINT TRIGGER laundry_journal_lines_balance AFTER INSERT OR UPDATE OR DELETE ON "LaundryJournalLine" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_laundry_journal_balance();
ALTER TABLE "LaundryExpense" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'unspecified' CHECK("method" IN ('cash','transfer','unspecified'));
ALTER TABLE "LaundryBook" ADD COLUMN "initializedAt" TIMESTAMPTZ;
CREATE FUNCTION reject_laundry_journal_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'LAUNDRY_POSTED_JOURNAL_IMMUTABLE'; END $$;
CREATE TRIGGER laundry_journal_immutable BEFORE UPDATE ON "LaundryJournal" FOR EACH ROW EXECUTE FUNCTION reject_laundry_journal_update();
CREATE TRIGGER laundry_journal_line_immutable BEFORE UPDATE ON "LaundryJournalLine" FOR EACH ROW EXECUTE FUNCTION reject_laundry_journal_update();
