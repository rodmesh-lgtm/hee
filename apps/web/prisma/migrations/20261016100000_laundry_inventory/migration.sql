CREATE TABLE "LaundryWarehouse" (
 id TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE RESTRICT,
 name TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE("businessId",id), UNIQUE("businessId",name)
);
CREATE TABLE "LaundryStockItem" (
 id TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE RESTRICT,
 sku TEXT NOT NULL, name TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('piece','liter','kg')),
 "reorderLevel" BIGINT NOT NULL DEFAULT 0 CHECK("reorderLevel">=0 AND "reorderLevel"<=1000000000),
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE("businessId",id),UNIQUE("businessId",sku)
);
-- Quantities use thousandths of the named unit; no guessed monetary valuation.
CREATE TABLE "LaundryStockBalance" (
 "businessId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL, "itemId" TEXT NOT NULL,
 quantity BIGINT NOT NULL DEFAULT 0 CHECK(quantity>=0 AND quantity<=1000000000000),
 version INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY("businessId","warehouseId","itemId"),
 FOREIGN KEY("businessId","warehouseId") REFERENCES "LaundryWarehouse"("businessId",id) ON DELETE RESTRICT,
 FOREIGN KEY("businessId","itemId") REFERENCES "LaundryStockItem"("businessId",id) ON DELETE RESTRICT
);
CREATE TABLE "LaundryStockMovement" (
 id TEXT PRIMARY KEY, "businessId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL, "itemId" TEXT NOT NULL,
 "requestId" TEXT NOT NULL, leg TEXT NOT NULL CHECK(leg IN ('single','from','to')),
 kind TEXT NOT NULL CHECK(kind IN ('receipt','issue','count','transfer')),
 quantity BIGINT NOT NULL CHECK((quantity<>0 OR kind='count') AND abs(quantity)<=1000000000),
 "balanceAfter" BIGINT NOT NULL CHECK("balanceAfter">=0), reason TEXT NOT NULL,
 "createdBy" TEXT NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE("businessId","requestId",leg),
 FOREIGN KEY("businessId","warehouseId","itemId") REFERENCES "LaundryStockBalance"("businessId","warehouseId","itemId") ON DELETE RESTRICT
);
CREATE INDEX "LaundryStockMovement_history" ON "LaundryStockMovement"("businessId","createdAt",id);
CREATE FUNCTION reject_laundry_stock_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'LAUNDRY_STOCK_MOVEMENT_IMMUTABLE'; END $$;
CREATE TRIGGER laundry_stock_movement_immutable BEFORE UPDATE ON "LaundryStockMovement" FOR EACH ROW EXECUTE FUNCTION reject_laundry_stock_update();
