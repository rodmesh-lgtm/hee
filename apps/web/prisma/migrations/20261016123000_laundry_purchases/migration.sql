CREATE TABLE "LaundrySupplier" (
 id TEXT PRIMARY KEY,"businessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE RESTRICT,
 name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE("businessId",id),UNIQUE("businessId",name)
);
-- Operating purchases expensed immediately; no claim of perpetual inventory valuation.
CREATE TABLE "LaundryPurchase" (
 id TEXT PRIMARY KEY,"businessId" TEXT NOT NULL REFERENCES "LaundryBook"("businessId") ON DELETE RESTRICT,
 "supplierId" TEXT NOT NULL,"requestId" TEXT NOT NULL,reference TEXT NOT NULL,description TEXT NOT NULL,
 total INTEGER NOT NULL CHECK(total>0 AND total<=10000000),paid INTEGER NOT NULL DEFAULT 0 CHECK(paid>=0 AND paid<=total),
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),"createdBy" TEXT NOT NULL,
 UNIQUE("businessId",id),UNIQUE("businessId","requestId"),UNIQUE("businessId","supplierId",reference),
 FOREIGN KEY("businessId","supplierId") REFERENCES "LaundrySupplier"("businessId",id) ON DELETE RESTRICT
);
CREATE TABLE "LaundrySupplierPayment" (
 id TEXT PRIMARY KEY,"businessId" TEXT NOT NULL,"purchaseId" TEXT NOT NULL,"requestId" TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0 AND amount<=10000000),method TEXT NOT NULL CHECK(method IN ('cash','transfer')),
 reference TEXT NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),"createdBy" TEXT NOT NULL,
 UNIQUE("businessId","requestId"),
 FOREIGN KEY("businessId","purchaseId") REFERENCES "LaundryPurchase"("businessId",id) ON DELETE RESTRICT
);
CREATE INDEX "LaundryPurchase_supplier" ON "LaundryPurchase"("businessId","supplierId","createdAt");
CREATE FUNCTION reject_laundry_supplier_payment_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'LAUNDRY_SUPPLIER_PAYMENT_IMMUTABLE'; END $$;
CREATE TRIGGER laundry_supplier_payment_immutable BEFORE UPDATE ON "LaundrySupplierPayment" FOR EACH ROW EXECUTE FUNCTION reject_laundry_supplier_payment_update();
