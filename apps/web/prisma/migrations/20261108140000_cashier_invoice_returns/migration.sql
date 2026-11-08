ALTER TABLE "LaundryTicket" ADD COLUMN returned INTEGER NOT NULL DEFAULT 0 CHECK(returned>=0 AND returned<=total);
ALTER TABLE "LaundryTicket" ADD COLUMN refunded INTEGER NOT NULL DEFAULT 0 CHECK(refunded>=0 AND refunded<=paid AND refunded<=returned);
CREATE TABLE "CashierReturn" (
 id TEXT PRIMARY KEY, "businessId" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "requestId" TEXT NOT NULL,
 number INTEGER NOT NULL CHECK(number>0), reason TEXT NOT NULL CHECK(length(reason) BETWEEN 4 AND 300),
 items JSONB NOT NULL CHECK(jsonb_typeof(items)='array' AND jsonb_array_length(items)>0),
 amount INTEGER NOT NULL CHECK(amount>0 AND amount<=100000000),
 "commissionReversed" INTEGER NOT NULL DEFAULT 0 CHECK("commissionReversed">=0 AND "commissionReversed"<=amount),
 "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE("businessId",id),UNIQUE("businessId","requestId"),UNIQUE("businessId",number),
 FOREIGN KEY("businessId","ticketId") REFERENCES "LaundryTicket"("businessId",id) ON DELETE RESTRICT
);
CREATE TABLE "CashierRefund" (
 id TEXT PRIMARY KEY,"businessId" TEXT NOT NULL,"ticketId" TEXT NOT NULL,"paymentId" TEXT NOT NULL,"requestId" TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0 AND amount<=100000000),
 method TEXT NOT NULL CHECK(method IN ('cash','card','transfer','prepaid')),
 reference TEXT NOT NULL CHECK(length(reference) BETWEEN 4 AND 300),
 "prepaidId" TEXT,units INTEGER NOT NULL DEFAULT 0 CHECK(units>=0),
 "createdBy" TEXT NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE("businessId","requestId"),
 FOREIGN KEY("businessId","ticketId") REFERENCES "LaundryTicket"("businessId",id) ON DELETE RESTRICT,
 FOREIGN KEY("businessId","paymentId") REFERENCES "LaundryPayment"("businessId",id) ON DELETE RESTRICT,
 FOREIGN KEY("businessId","prepaidId") REFERENCES "LaundryPrepaid"("businessId",id) ON DELETE RESTRICT,
 CHECK((method='prepaid' AND "prepaidId" IS NOT NULL) OR (method<>'prepaid' AND "prepaidId" IS NULL AND units=0))
);
CREATE INDEX "CashierReturn_ticket" ON "CashierReturn"("businessId","ticketId","createdAt");
CREATE INDEX "CashierRefund_ticket" ON "CashierRefund"("businessId","ticketId","createdAt");
CREATE FUNCTION cashier_return_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'CASHIER_RETURN_IMMUTABLE'; END $$;
CREATE TRIGGER cashier_return_immutable BEFORE UPDATE OR DELETE ON "CashierReturn" FOR EACH ROW EXECUTE FUNCTION cashier_return_immutable();
CREATE TRIGGER cashier_refund_immutable BEFORE UPDATE OR DELETE ON "CashierRefund" FOR EACH ROW EXECUTE FUNCTION cashier_return_immutable();
CREATE FUNCTION cashier_refund_payment_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p "LaundryPayment"; t "LaundryTicket";
BEGIN
 SELECT * INTO t FROM "LaundryTicket" WHERE "businessId"=NEW."businessId" AND id=NEW."ticketId" FOR UPDATE;
 SELECT * INTO p FROM "LaundryPayment" WHERE "businessId"=NEW."businessId" AND id=NEW."paymentId";
 IF p.id IS NULL OR p."ticketId"<>NEW."ticketId" OR p.method<>NEW.method THEN RAISE EXCEPTION 'REFUND_PAYMENT_MISMATCH'; END IF;
 IF NEW.amount+COALESCE((SELECT SUM(amount) FROM "CashierRefund" WHERE "businessId"=NEW."businessId" AND "paymentId"=p.id),0)>p.amount THEN RAISE EXCEPTION 'REFUND_EXCEEDS_PAYMENT'; END IF;
 IF NEW.amount>GREATEST(0,t.paid-t.refunded-(t.total-t.returned)) THEN RAISE EXCEPTION 'REFUND_EXCEEDS_CREDIT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cashier_refund_payment_guard BEFORE INSERT ON "CashierRefund" FOR EACH ROW EXECUTE FUNCTION cashier_refund_payment_guard();
CREATE VIEW "CashierCommissionEvent" AS
 SELECT id,"businessId","ticketId",name,phone,kind,value,base,amount,"createdAt" FROM "CashierCommission"
 UNION ALL
 SELECT r.id,r."businessId",r."ticketId",c.name,c.phone,c.kind,c.value,c.base,-r."commissionReversed" AS amount,r."createdAt"
 FROM "CashierReturn" r JOIN "CashierCommission" c ON c."businessId"=r."businessId" AND c."ticketId"=r."ticketId" WHERE r."commissionReversed">0;
