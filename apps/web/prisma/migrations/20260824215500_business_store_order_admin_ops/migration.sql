-- Central HEE operator audit trail for Business Store order lifecycle changes.
-- This is intentionally separate from subscription BillingPayment records.
CREATE TABLE "BusinessStoreOrderAudit" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "paymentStatus" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessStoreOrderAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessStoreOrderAudit_action_check" CHECK ("action" = 'status_transition'),
  CONSTRAINT "BusinessStoreOrderAudit_status_text_check" CHECK (
    btrim("fromStatus") <> '' AND btrim("toStatus") <> '' AND btrim("paymentStatus") <> ''
  ),
  CONSTRAINT "BusinessStoreOrderAudit_note_length_check" CHECK ("note" IS NULL OR char_length("note") <= 500)
);

CREATE INDEX "BusinessStoreOrderAudit_order_created_idx"
ON "BusinessStoreOrderAudit"("orderId", "createdAt" DESC);

CREATE INDEX "BusinessStoreOrderAudit_actor_created_idx"
ON "BusinessStoreOrderAudit"("actorUserId", "createdAt" DESC);

ALTER TABLE "BusinessStoreOrderAudit"
ADD CONSTRAINT "BusinessStoreOrderAudit_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "BusinessStoreOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BusinessStoreOrderAudit"
ADD CONSTRAINT "BusinessStoreOrderAudit_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Strengthen the existing lifecycle at the database boundary. Administrative UI
-- checks are not the security boundary: entering fulfillment states requires paid.
CREATE OR REPLACE FUNCTION "hee_validate_business_store_order_transition"()
RETURNS trigger AS $$
DECLARE
  item_count INTEGER;
  item_subtotal BIGINT;
BEGIN
  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
    (OLD."status" = 'draft' AND NEW."status" IN ('submitted', 'cancelled')) OR
    (OLD."status" = 'submitted' AND NEW."status" IN ('processing', 'cancelled')) OR
    (OLD."status" = 'processing' AND NEW."status" IN ('shipped', 'cancelled')) OR
    (OLD."status" = 'shipped' AND NEW."status" = 'fulfilled')
  ) THEN
    RAISE EXCEPTION 'invalid business store order status transition: % -> %', OLD."status", NEW."status";
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status"
     AND NEW."status" IN ('processing', 'shipped', 'fulfilled')
     AND NEW."paymentStatus" <> 'paid' THEN
    RAISE EXCEPTION 'business store order cannot enter fulfillment lifecycle before payment is paid';
  END IF;

  IF OLD."status" = 'draft' AND NEW."status" = 'submitted' THEN
    SELECT COUNT(*), COALESCE(SUM("lineTotal"), 0)
      INTO item_count, item_subtotal
    FROM "BusinessStoreOrderItem"
    WHERE "orderId" = OLD."id";

    IF item_count = 0 THEN
      RAISE EXCEPTION 'business store order cannot be submitted without items';
    END IF;

    IF item_subtotal <> NEW."subtotal" THEN
      RAISE EXCEPTION 'business store order subtotal does not match item totals';
    END IF;

    IF NULLIF(btrim(NEW."shippingName"), '') IS NULL
      OR NULLIF(btrim(NEW."shippingPhone"), '') IS NULL
      OR NULLIF(btrim(NEW."shippingAddressLine1"), '') IS NULL
      OR NULLIF(btrim(NEW."shippingCity"), '') IS NULL THEN
      RAISE EXCEPTION 'business store order shipping snapshot is incomplete';
    END IF;
  END IF;

  IF NEW."paymentStatus" IS DISTINCT FROM OLD."paymentStatus" AND NOT (
    (OLD."paymentStatus" = 'unpaid' AND NEW."paymentStatus" IN ('pending', 'paid', 'failed')) OR
    (OLD."paymentStatus" = 'pending' AND NEW."paymentStatus" IN ('paid', 'failed')) OR
    (OLD."paymentStatus" = 'failed' AND NEW."paymentStatus" IN ('pending', 'paid')) OR
    (OLD."paymentStatus" = 'paid' AND NEW."paymentStatus" = 'refunded')
  ) THEN
    RAISE EXCEPTION 'invalid business store payment status transition: % -> %', OLD."paymentStatus", NEW."paymentStatus";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;