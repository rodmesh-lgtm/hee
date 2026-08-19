-- Enforce same-business relationships for multi-tenant records.
-- Prisma application checks remain useful for friendly errors, but the database
-- is the final guard against future code paths linking records across businesses.
-- Refuse to install the guards over already-corrupt historical relationships so
-- a release cannot silently preserve cross-tenant links.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Product" p
    JOIN "Category" c ON c."id" = p."categoryId"
    WHERE p."categoryId" IS NOT NULL AND p."businessId" <> c."businessId"
  ) THEN RAISE EXCEPTION 'historical product/category cross-business relation detected'; END IF;

  IF EXISTS (
    SELECT 1 FROM "Order" o
    JOIN "Customer" c ON c."id" = o."customerId"
    WHERE o."businessId" <> c."businessId"
  ) THEN RAISE EXCEPTION 'historical order/customer cross-business relation detected'; END IF;

  IF EXISTS (
    SELECT 1 FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    JOIN "Product" p ON p."id" = oi."productId"
    WHERE oi."productId" IS NOT NULL AND o."businessId" <> p."businessId"
  ) THEN RAISE EXCEPTION 'historical order-item/product cross-business relation detected'; END IF;

  IF EXISTS (
    SELECT 1 FROM "Booking" b
    JOIN "Customer" c ON c."id" = b."customerId"
    WHERE b."businessId" <> c."businessId"
  ) THEN RAISE EXCEPTION 'historical booking/customer cross-business relation detected'; END IF;

  IF EXISTS (
    SELECT 1 FROM "Booking" b
    JOIN "Service" s ON s."id" = b."serviceId"
    WHERE b."serviceId" IS NOT NULL AND b."businessId" <> s."businessId"
  ) THEN RAISE EXCEPTION 'historical booking/service cross-business relation detected'; END IF;

  IF EXISTS (
    SELECT 1 FROM "ContactPerson" cp
    JOIN "Department" d ON d."id" = cp."departmentId"
    WHERE cp."departmentId" IS NOT NULL AND cp."businessId" <> d."businessId"
  ) THEN RAISE EXCEPTION 'historical contact/department cross-business relation detected'; END IF;

  IF EXISTS (
    SELECT 1 FROM "ContactPerson" cp
    JOIN "Branch" b ON b."id" = cp."branchId"
    WHERE cp."branchId" IS NOT NULL AND cp."businessId" <> b."businessId"
  ) THEN RAISE EXCEPTION 'historical contact/branch cross-business relation detected'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_product_category_business()
RETURNS trigger AS $$
BEGIN
  IF NEW."categoryId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Category"
    WHERE "id" = NEW."categoryId" AND "businessId" = NEW."businessId"
  ) THEN
    RAISE EXCEPTION 'product category must belong to the same business';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Product_same_business_category" ON "Product";
CREATE TRIGGER "Product_same_business_category"
BEFORE INSERT OR UPDATE OF "businessId", "categoryId" ON "Product"
FOR EACH ROW EXECUTE FUNCTION enforce_product_category_business();

CREATE OR REPLACE FUNCTION enforce_order_customer_business()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Customer"
    WHERE "id" = NEW."customerId" AND "businessId" = NEW."businessId"
  ) THEN
    RAISE EXCEPTION 'order customer must belong to the same business';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Order_same_business_customer" ON "Order";
CREATE TRIGGER "Order_same_business_customer"
BEFORE INSERT OR UPDATE OF "businessId", "customerId" ON "Order"
FOR EACH ROW EXECUTE FUNCTION enforce_order_customer_business();

CREATE OR REPLACE FUNCTION enforce_order_item_product_business()
RETURNS trigger AS $$
DECLARE
  order_business TEXT;
BEGIN
  IF NEW."productId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "businessId" INTO order_business FROM "Order" WHERE "id" = NEW."orderId";
  IF order_business IS NULL OR NOT EXISTS (
    SELECT 1 FROM "Product"
    WHERE "id" = NEW."productId" AND "businessId" = order_business
  ) THEN
    RAISE EXCEPTION 'order item product must belong to the order business';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "OrderItem_same_business_product" ON "OrderItem";
CREATE TRIGGER "OrderItem_same_business_product"
BEFORE INSERT OR UPDATE OF "orderId", "productId" ON "OrderItem"
FOR EACH ROW EXECUTE FUNCTION enforce_order_item_product_business();

CREATE OR REPLACE FUNCTION enforce_booking_business_relations()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Customer"
    WHERE "id" = NEW."customerId" AND "businessId" = NEW."businessId"
  ) THEN
    RAISE EXCEPTION 'booking customer must belong to the same business';
  END IF;

  IF NEW."serviceId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Service"
    WHERE "id" = NEW."serviceId" AND "businessId" = NEW."businessId"
  ) THEN
    RAISE EXCEPTION 'booking service must belong to the same business';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Booking_same_business_relations" ON "Booking";
CREATE TRIGGER "Booking_same_business_relations"
BEFORE INSERT OR UPDATE OF "businessId", "customerId", "serviceId" ON "Booking"
FOR EACH ROW EXECUTE FUNCTION enforce_booking_business_relations();

CREATE OR REPLACE FUNCTION enforce_contact_business_relations()
RETURNS trigger AS $$
BEGIN
  IF NEW."departmentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Department"
    WHERE "id" = NEW."departmentId" AND "businessId" = NEW."businessId"
  ) THEN
    RAISE EXCEPTION 'contact department must belong to the same business';
  END IF;

  IF NEW."branchId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Branch"
    WHERE "id" = NEW."branchId" AND "businessId" = NEW."businessId"
  ) THEN
    RAISE EXCEPTION 'contact branch must belong to the same business';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "ContactPerson_same_business_relations" ON "ContactPerson";
CREATE TRIGGER "ContactPerson_same_business_relations"
BEFORE INSERT OR UPDATE OF "businessId", "departmentId", "branchId" ON "ContactPerson"
FOR EACH ROW EXECUTE FUNCTION enforce_contact_business_relations();
