-- Prepaid monetary subscriptions, no bonuses or forfeiture of customer balances.
CREATE TABLE "LaundryPrepaid" (
 id TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "LaundryBook"("businessId") ON DELETE RESTRICT,
 "customerId" TEXT NOT NULL, "requestId" TEXT NOT NULL, name TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0 AND amount<=10000000),
 remaining INTEGER NOT NULL CHECK(remaining>=0 AND remaining<=amount),
 "expiresAt" TIMESTAMPTZ NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "createdBy" TEXT NOT NULL,
 UNIQUE("businessId",id), UNIQUE("businessId","requestId"),
 FOREIGN KEY("businessId","customerId") REFERENCES "LaundryCustomer"("businessId",id) ON DELETE RESTRICT
);
ALTER TABLE "LaundryPayment" DROP CONSTRAINT "LaundryPayment_method_check";
ALTER TABLE "LaundryPayment" ADD CONSTRAINT "LaundryPayment_method_check" CHECK(method IN ('cash','card','transfer','prepaid'));
ALTER TABLE "LaundryPayment" ADD CONSTRAINT "LaundryPayment_business_id_key" UNIQUE("businessId",id);
CREATE TABLE "LaundryPrepaidMovement" (
 id TEXT PRIMARY KEY, "businessId" TEXT NOT NULL, "prepaidId" TEXT NOT NULL,
 "requestId" TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('purchase','redeem','refund')),
 amount INTEGER NOT NULL CHECK(amount>0 AND amount<=10000000),
 method TEXT NOT NULL CHECK(method IN ('cash','card','transfer','prepaid')),
 "paymentId" TEXT, reason TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "createdBy" TEXT NOT NULL,
 UNIQUE("businessId","requestId"), UNIQUE("paymentId"),
 FOREIGN KEY("businessId","prepaidId") REFERENCES "LaundryPrepaid"("businessId",id) ON DELETE RESTRICT,
 FOREIGN KEY("businessId","paymentId") REFERENCES "LaundryPayment"("businessId",id) ON DELETE RESTRICT,
 CHECK((kind='redeem' AND method='prepaid' AND "paymentId" IS NOT NULL) OR (kind='purchase' AND method IN ('cash','card','transfer') AND "paymentId" IS NULL) OR (kind='refund' AND method IN ('cash','transfer') AND "paymentId" IS NULL))
);
CREATE INDEX "LaundryPrepaid_customer" ON "LaundryPrepaid"("businessId","customerId","createdAt");
CREATE INDEX "LaundryPrepaidMovement_history" ON "LaundryPrepaidMovement"("businessId","createdAt");
CREATE FUNCTION reject_laundry_prepaid_movement_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'LAUNDRY_PREPAID_MOVEMENT_IMMUTABLE'; END $$;
CREATE TRIGGER laundry_prepaid_movement_immutable BEFORE UPDATE ON "LaundryPrepaidMovement" FOR EACH ROW EXECUTE FUNCTION reject_laundry_prepaid_movement_update();
