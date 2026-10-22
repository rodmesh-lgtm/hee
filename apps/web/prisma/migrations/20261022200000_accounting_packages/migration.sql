-- Reusable monetary packages. Existing prepaid balances remain unchanged.
CREATE TABLE "AccountingPackage" (
 id TEXT PRIMARY KEY,
 "businessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE RESTRICT,
 name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 amount INTEGER NOT NULL CHECK(amount>0 AND amount<=10000000),
 "durationDays" INTEGER NOT NULL CHECK("durationDays" BETWEEN 1 AND 366),
 "serviceIds" JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof("serviceIds")='array'),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "createdBy" TEXT NOT NULL,
 UNIQUE("businessId",id)
);
CREATE INDEX "AccountingPackage_business" ON "AccountingPackage"("businessId",active);
ALTER TABLE "LaundryPrepaid"
 ADD COLUMN "packageId" TEXT,
 ADD COLUMN "packageDescription" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "serviceIds" JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof("serviceIds")='array'),
 ADD COLUMN "startsAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 ADD CONSTRAINT "LaundryPrepaid_package_scope" FOREIGN KEY("businessId","packageId") REFERENCES "AccountingPackage"("businessId",id) ON DELETE RESTRICT;
UPDATE "LaundryPrepaid" SET "startsAt"="createdAt";
