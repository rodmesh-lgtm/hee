-- Additive: legacy subscriptions retain monetary semantics.
ALTER TABLE "AccountingPackage"
 ADD COLUMN kind TEXT NOT NULL DEFAULT 'credit',
 ADD COLUMN "unitsIncluded" INTEGER,
 ADD CONSTRAINT "AccountingPackage_counted" CHECK (
 (kind='credit' AND "unitsIncluded" IS NULL) OR
 (kind IN ('pieces','visits') AND "unitsIncluded" IS NOT NULL AND "unitsIncluded" BETWEEN 1 AND 10000 AND amount>="unitsIncluded" AND jsonb_array_length("serviceIds")=1));
ALTER TABLE "LaundryPrepaid"
 ADD COLUMN kind TEXT NOT NULL DEFAULT 'credit',
 ADD COLUMN "unitsIncluded" INTEGER,
 ADD COLUMN "unitsRemaining" INTEGER,
 ADD CONSTRAINT "LaundryPrepaid_counted" CHECK (
 (kind='credit' AND "unitsIncluded" IS NULL AND "unitsRemaining" IS NULL) OR
 (kind IN ('pieces','visits') AND "unitsIncluded" IS NOT NULL AND "unitsIncluded" BETWEEN 1 AND 10000 AND "unitsRemaining" IS NOT NULL AND "unitsRemaining" BETWEEN 0 AND "unitsIncluded" AND remaining>="unitsRemaining" AND ("unitsRemaining">0 OR remaining=0) AND jsonb_array_length("serviceIds")=1));
ALTER TABLE "LaundryPrepaidMovement" ADD COLUMN units INTEGER NOT NULL DEFAULT 0 CHECK(units>=0 AND units<=10000);
