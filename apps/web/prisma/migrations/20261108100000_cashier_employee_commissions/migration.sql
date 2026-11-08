-- An internal commission register. No changes to customer invoice totals or prior invoices.
CREATE TABLE "CashierCommission" (
  id TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE RESTRICT,
  "ticketId" TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  phone TEXT NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  kind TEXT NOT NULL CHECK (kind IN ('fixed','percent')),
  value INTEGER NOT NULL CHECK (value > 0),
  base INTEGER NOT NULL CHECK (base > 0 AND base <= 100000000),
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount <= base),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("businessId", "ticketId"),
  FOREIGN KEY ("businessId", "ticketId") REFERENCES "LaundryTicket"("businessId", id) ON DELETE RESTRICT,
  CHECK ((kind='fixed' AND value=amount AND value<=10000000) OR
         (kind='percent' AND value<=10000 AND amount=round(base::numeric*value/10000)))
);
CREATE INDEX "CashierCommission_business_date" ON "CashierCommission"("businessId", "createdAt" DESC, id);
CREATE INDEX "CashierCommission_business_phone" ON "CashierCommission"("businessId", phone, "createdAt" DESC);
