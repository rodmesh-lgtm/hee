CREATE TABLE "LaundryService" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
  "name" TEXT NOT NULL, "category" TEXT NOT NULL, "price" INTEGER NOT NULL CHECK ("price" >= 0 AND "price" <= 10000000),
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "LaundryService_business" ON "LaundryService"("businessId");
CREATE TABLE "LaundryTicket" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
  "number" INTEGER NOT NULL CHECK ("number" > 0), "requestId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL, "phone" TEXT NOT NULL, "items" JSONB NOT NULL,
  "total" INTEGER NOT NULL CHECK ("total" >= 0), "paid" INTEGER NOT NULL DEFAULT 0 CHECK ("paid" >= 0 AND "paid" <= "total"),
  "status" TEXT NOT NULL DEFAULT 'received' CHECK ("status" IN ('received','processing','ready','delivered')),
  "dueAt" TIMESTAMPTZ NOT NULL, "notes" TEXT NOT NULL DEFAULT '', "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("businessId","number"), UNIQUE ("businessId","requestId"), UNIQUE ("businessId","id")
);
CREATE INDEX "LaundryTicket_business_created" ON "LaundryTicket"("businessId","createdAt" DESC);
CREATE TABLE "LaundryPayment" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL, "ticketId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL, "amount" INTEGER NOT NULL CHECK ("amount" > 0),
  "method" TEXT NOT NULL CHECK ("method" IN ('cash','card','transfer')), "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE ("businessId","requestId"),
  FOREIGN KEY ("businessId","ticketId") REFERENCES "LaundryTicket"("businessId","id") ON DELETE RESTRICT
);
CREATE TABLE "LaundryExpense" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
  "requestId" TEXT NOT NULL, "description" TEXT NOT NULL, "amount" INTEGER NOT NULL CHECK ("amount" > 0),
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE ("businessId","requestId")
);
CREATE TABLE "LaundryAudit" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
  "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "targetId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
