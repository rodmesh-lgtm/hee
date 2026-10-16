CREATE TABLE "LaundryCustomer" (
 "id" TEXT PRIMARY KEY,
 "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
 "name" TEXT NOT NULL, "phone" TEXT NOT NULL CHECK("phone" ~ '^\+[1-9][0-9]{7,14}$'),
 "notes" TEXT NOT NULL DEFAULT '', "address" TEXT NOT NULL DEFAULT '',
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE("businessId","id"), UNIQUE("businessId","phone")
);
ALTER TABLE "LaundryTicket" ADD COLUMN "customerId" TEXT;
ALTER TABLE "LaundryTicket" ADD CONSTRAINT "LaundryTicket_customer_tenant_fk" FOREIGN KEY("businessId","customerId") REFERENCES "LaundryCustomer"("businessId","id") ON DELETE RESTRICT;
CREATE INDEX "LaundryTicket_customer" ON "LaundryTicket"("businessId","customerId","createdAt");
