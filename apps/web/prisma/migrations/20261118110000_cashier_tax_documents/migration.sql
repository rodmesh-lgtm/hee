CREATE TABLE "CashierTaxProfile" (
  "businessId" TEXT PRIMARY KEY REFERENCES "Business"(id) ON DELETE CASCADE,
  "sellerName" TEXT NOT NULL CHECK (octet_length("sellerName") BETWEEN 2 AND 255),
  "sellerAddress" TEXT NOT NULL CHECK (length("sellerAddress") BETWEEN 5 AND 300),
  "vatNumber" TEXT NOT NULL CHECK ("vatNumber" ~ '^3[0-9]{13}3$'),
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE "CashierTaxDocument" (
  "businessId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "returnId" TEXT,
  "number" INTEGER NOT NULL CHECK ("number" > 0),
  "sellerName" TEXT NOT NULL CHECK (octet_length("sellerName") BETWEEN 2 AND 255),
  "sellerAddress" TEXT NOT NULL CHECK (length("sellerAddress") BETWEEN 5 AND 300),
  "vatNumber" TEXT NOT NULL CHECK ("vatNumber" ~ '^3[0-9]{13}3$'),
  "issuedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "gross" INTEGER NOT NULL CHECK ("gross" > 0),
  "vat" INTEGER NOT NULL CHECK ("vat" >= 0 AND "vat" <= "gross"),
  "originalNumber" INTEGER,
  PRIMARY KEY ("businessId", "number"),
  FOREIGN KEY ("businessId", "ticketId") REFERENCES "LaundryTicket" ("businessId", id),
  FOREIGN KEY ("businessId", "returnId") REFERENCES "CashierReturn" ("businessId", id),
  FOREIGN KEY ("businessId", "originalNumber") REFERENCES "CashierTaxDocument" ("businessId", "number"),
  CHECK (("returnId" IS NULL) = ("originalNumber" IS NULL)),
  UNIQUE ("businessId", "returnId")
);
CREATE UNIQUE INDEX "CashierTaxDocument_invoice" ON "CashierTaxDocument" ("businessId", "ticketId") WHERE "returnId" IS NULL;
CREATE INDEX "CashierTaxDocument_ticket" ON "CashierTaxDocument" ("businessId", "ticketId", "number");
CREATE TRIGGER cashier_tax_document_immutable BEFORE UPDATE OR DELETE ON "CashierTaxDocument"
  FOR EACH ROW EXECUTE FUNCTION cashier_return_immutable();

CREATE FUNCTION cashier_tax_document_source_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."returnId" IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM "LaundryTicket" t
      WHERE t."businessId" = NEW."businessId" AND t.id = NEW."ticketId" AND t.total = NEW."gross")
    THEN RAISE EXCEPTION 'CASHIER_TAX_INVOICE_SOURCE_MISMATCH'; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM "CashierReturn" r JOIN "CashierTaxDocument" d
      ON d."businessId" = r."businessId" AND d."ticketId" = r."ticketId" AND d."returnId" IS NULL
      WHERE r."businessId" = NEW."businessId" AND r.id = NEW."returnId" AND r."ticketId" = NEW."ticketId"
        AND d."number" = NEW."originalNumber" AND r.amount = NEW."gross"
        AND (d."sellerName", d."sellerAddress", d."vatNumber") = (NEW."sellerName", NEW."sellerAddress", NEW."vatNumber"))
    THEN RAISE EXCEPTION 'CASHIER_TAX_CREDIT_SOURCE_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cashier_tax_document_source_guard BEFORE INSERT ON "CashierTaxDocument"
  FOR EACH ROW EXECUTE FUNCTION cashier_tax_document_source_guard();

CREATE FUNCTION cashier_tax_invoice_source_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.items, NEW.total, NEW.number, NEW."createdAt") IS DISTINCT FROM
     (OLD.items, OLD.total, OLD.number, OLD."createdAt")
    AND EXISTS (SELECT 1 FROM "CashierTaxDocument" d
      WHERE d."businessId" = OLD."businessId" AND d."ticketId" = OLD.id)
  THEN RAISE EXCEPTION 'CASHIER_TAX_INVOICE_SOURCE_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cashier_tax_invoice_source_immutable
  BEFORE UPDATE OF "items", "total", "number", "createdAt" ON "LaundryTicket"
  FOR EACH ROW EXECUTE FUNCTION cashier_tax_invoice_source_immutable();
