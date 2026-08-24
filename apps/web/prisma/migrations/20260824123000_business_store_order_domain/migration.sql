-- HEE Business Store orders are intentionally isolated from tenant customer Order
-- records and from recurring subscription BillingPayment records.

CREATE TABLE "BusinessStoreOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "shippingAmount" INTEGER NOT NULL DEFAULT 0,
    "vatAmount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "businessNameSnapshot" TEXT NOT NULL,
    "businessSlugSnapshot" TEXT NOT NULL,
    "publicUrlSnapshot" TEXT NOT NULL,
    "logoUrlSnapshot" TEXT,
    "primaryColorSnapshot" TEXT NOT NULL,
    "secondaryColorSnapshot" TEXT,
    "identitySnapshot" JSONB NOT NULL,
    "customizationSnapshot" JSONB NOT NULL,
    "shippingName" TEXT,
    "shippingPhone" TEXT,
    "shippingEmail" TEXT,
    "shippingAddressLine1" TEXT,
    "shippingAddressLine2" TEXT,
    "shippingCity" TEXT,
    "shippingDistrict" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT NOT NULL DEFAULT 'SA',
    "paymentProvider" TEXT,
    "providerPaymentId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessStoreOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusinessStoreOrder_amounts_nonnegative_check" CHECK (
      "subtotal" >= 0 AND "shippingAmount" >= 0 AND "vatAmount" >= 0 AND "total" >= 0
    ),
    CONSTRAINT "BusinessStoreOrder_total_formula_check" CHECK (
      "total" = "subtotal" + "shippingAmount" + "vatAmount"
    ),
    CONSTRAINT "BusinessStoreOrder_status_check" CHECK (
      "status" IN ('draft', 'submitted', 'processing', 'shipped', 'fulfilled', 'cancelled')
    ),
    CONSTRAINT "BusinessStoreOrder_payment_status_check" CHECK (
      "paymentStatus" IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')
    ),
    CONSTRAINT "BusinessStoreOrder_currency_check" CHECK ("currency" = 'SAR'),
    CONSTRAINT "BusinessStoreOrder_payment_provider_pair_check" CHECK (
      ("paymentProvider" IS NULL AND "providerPaymentId" IS NULL)
      OR ("paymentProvider" IS NOT NULL AND "providerPaymentId" IS NOT NULL)
    ),
    CONSTRAINT "BusinessStoreOrder_paid_timestamp_check" CHECK (
      "paymentStatus" NOT IN ('paid', 'refunded') OR "paidAt" IS NOT NULL
    )
);

CREATE TABLE "BusinessStoreOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lineTotal" INTEGER NOT NULL,
    "customizationSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessStoreOrderItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusinessStoreOrderItem_unit_price_check" CHECK ("unitPrice" >= 0),
    CONSTRAINT "BusinessStoreOrderItem_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "BusinessStoreOrderItem_line_total_check" CHECK (
      "lineTotal" >= 0 AND "lineTotal" = "unitPrice" * "quantity"
    )
);

CREATE UNIQUE INDEX "BusinessStoreOrder_business_idempotency_unique"
ON "BusinessStoreOrder"("businessId", "idempotencyKey");

CREATE UNIQUE INDEX "BusinessStoreOrder_provider_payment_unique"
ON "BusinessStoreOrder"("paymentProvider", "providerPaymentId");

CREATE INDEX "BusinessStoreOrder_business_created_idx"
ON "BusinessStoreOrder"("businessId", "createdAt");

CREATE INDEX "BusinessStoreOrder_status_created_idx"
ON "BusinessStoreOrder"("status", "createdAt");

CREATE INDEX "BusinessStoreOrder_payment_status_created_idx"
ON "BusinessStoreOrder"("paymentStatus", "createdAt");

CREATE INDEX "BusinessStoreOrderItem_order_idx"
ON "BusinessStoreOrderItem"("orderId");

ALTER TABLE "BusinessStoreOrder"
ADD CONSTRAINT "BusinessStoreOrder_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BusinessStoreOrderItem"
ADD CONSTRAINT "BusinessStoreOrderItem_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "BusinessStoreOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Freeze the identity/design snapshot once a draft leaves the editable stage.
CREATE OR REPLACE FUNCTION "hee_protect_business_store_order_snapshot"()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" <> 'draft' AND (
    NEW."businessId" IS DISTINCT FROM OLD."businessId" OR
    NEW."businessNameSnapshot" IS DISTINCT FROM OLD."businessNameSnapshot" OR
    NEW."businessSlugSnapshot" IS DISTINCT FROM OLD."businessSlugSnapshot" OR
    NEW."publicUrlSnapshot" IS DISTINCT FROM OLD."publicUrlSnapshot" OR
    NEW."logoUrlSnapshot" IS DISTINCT FROM OLD."logoUrlSnapshot" OR
    NEW."primaryColorSnapshot" IS DISTINCT FROM OLD."primaryColorSnapshot" OR
    NEW."secondaryColorSnapshot" IS DISTINCT FROM OLD."secondaryColorSnapshot" OR
    NEW."identitySnapshot" IS DISTINCT FROM OLD."identitySnapshot" OR
    NEW."customizationSnapshot" IS DISTINCT FROM OLD."customizationSnapshot" OR
    NEW."subtotal" IS DISTINCT FROM OLD."subtotal" OR
    NEW."shippingAmount" IS DISTINCT FROM OLD."shippingAmount" OR
    NEW."vatAmount" IS DISTINCT FROM OLD."vatAmount" OR
    NEW."total" IS DISTINCT FROM OLD."total" OR
    NEW."currency" IS DISTINCT FROM OLD."currency"
  ) THEN
    RAISE EXCEPTION 'submitted business store order commercial snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BusinessStoreOrder_snapshot_immutable"
BEFORE UPDATE ON "BusinessStoreOrder"
FOR EACH ROW EXECUTE FUNCTION "hee_protect_business_store_order_snapshot"();

-- Items are editable only while their parent order is a draft.
CREATE OR REPLACE FUNCTION "hee_protect_business_store_order_items"()
RETURNS trigger AS $$
DECLARE
  parent_status TEXT;
  parent_id TEXT;
BEGIN
  parent_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."orderId" ELSE NEW."orderId" END;
  SELECT "status" INTO parent_status FROM "BusinessStoreOrder" WHERE "id" = parent_id;
  IF parent_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'business store order items are immutable after submission';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BusinessStoreOrderItem_draft_only_insert"
BEFORE INSERT ON "BusinessStoreOrderItem"
FOR EACH ROW EXECUTE FUNCTION "hee_protect_business_store_order_items"();

CREATE TRIGGER "BusinessStoreOrderItem_draft_only_update"
BEFORE UPDATE ON "BusinessStoreOrderItem"
FOR EACH ROW EXECUTE FUNCTION "hee_protect_business_store_order_items"();

CREATE TRIGGER "BusinessStoreOrderItem_draft_only_delete"
BEFORE DELETE ON "BusinessStoreOrderItem"
FOR EACH ROW EXECUTE FUNCTION "hee_protect_business_store_order_items"();