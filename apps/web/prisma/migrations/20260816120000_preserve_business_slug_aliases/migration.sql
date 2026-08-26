CREATE TABLE IF NOT EXISTS "BusinessSlugAlias" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessSlugAlias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessSlugAlias_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessSlugAlias_slug_key"
  ON "BusinessSlugAlias"("slug");
CREATE INDEX IF NOT EXISTS "BusinessSlugAlias_businessId_idx"
  ON "BusinessSlugAlias"("businessId");

CREATE OR REPLACE FUNCTION preserve_business_slug_alias()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM "BusinessSlugAlias" WHERE "slug" = NEW."slug") THEN
      RAISE EXCEPTION 'business slug is reserved by a legacy alias';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."slug" IS DISTINCT FROM OLD."slug" THEN
    IF EXISTS (
      SELECT 1 FROM "BusinessSlugAlias"
      WHERE "slug" = NEW."slug" AND "businessId" <> OLD."id"
    ) THEN
      RAISE EXCEPTION 'business slug is reserved by a legacy alias';
    END IF;

    INSERT INTO "BusinessSlugAlias" ("id", "businessId", "slug")
    VALUES (gen_random_uuid()::text, OLD."id", OLD."slug")
    ON CONFLICT ("slug") DO NOTHING;

    DELETE FROM "BusinessSlugAlias"
    WHERE "businessId" = OLD."id" AND "slug" = NEW."slug";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Business_preserve_slug_alias" ON "Business";
CREATE TRIGGER "Business_preserve_slug_alias"
BEFORE INSERT OR UPDATE OF "slug" ON "Business"
FOR EACH ROW
EXECUTE FUNCTION preserve_business_slug_alias();
