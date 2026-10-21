BEGIN;
ALTER TABLE "LaundryStockBalance" ADD COLUMN value BIGINT CHECK (value >= 0 AND value <= 1000000000000 AND (quantity > 0 OR value=0));
ALTER TABLE "LaundryStockMovement" ADD COLUMN "valueDelta" BIGINT CHECK (abs("valueDelta")<=1000000000000);
ALTER TABLE "LaundryPurchase" ADD COLUMN kind TEXT NOT NULL DEFAULT 'operating' CHECK (kind IN ('operating','inventory'));
ALTER TABLE "LaundryStockMovement" ADD COLUMN "purchaseId" TEXT,
 ADD CONSTRAINT "LaundryStockMovement_purchase" FOREIGN KEY ("businessId","purchaseId") REFERENCES "LaundryPurchase" ("businessId",id) ON DELETE RESTRICT,
 ADD CONSTRAINT "LaundryStockMovement_purchase_unique" UNIQUE ("businessId","purchaseId");
COMMIT;
