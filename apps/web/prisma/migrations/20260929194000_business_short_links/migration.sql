CREATE TABLE "BusinessShortLink" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "clicks" BIGINT NOT NULL DEFAULT 0,
  "lastClickedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessShortLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessShortLink_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BusinessShortLink_status_check" CHECK ("status" IN ('active', 'disabled', 'deleted')),
  CONSTRAINT "BusinessShortLink_code_check" CHECK ("code" ~ '^[A-Za-z0-9_-]{12}$'),
  CONSTRAINT "BusinessShortLink_clicks_check" CHECK ("clicks" >= 0),
  CONSTRAINT "BusinessShortLink_fields_check" CHECK (char_length("title") BETWEEN 1 AND 100 AND char_length("destination") BETWEEN 8 AND 2048 AND "destination" LIKE 'https://%')
);
CREATE UNIQUE INDEX "BusinessShortLink_code_key" ON "BusinessShortLink"("code");
CREATE INDEX "BusinessShortLink_businessId_status_createdAt_idx" ON "BusinessShortLink"("businessId", "status", "createdAt");
CREATE FUNCTION protect_business_short_link_identity() RETURNS trigger AS $$
BEGIN
  IF OLD."businessId" IS DISTINCT FROM NEW."businessId" OR OLD."code" IS DISTINCT FROM NEW."code" OR (OLD."status" = 'deleted' AND NEW."status" <> 'deleted') THEN
    RAISE EXCEPTION 'short link ownership, code and deletion are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "BusinessShortLink_identity_guard" BEFORE UPDATE ON "BusinessShortLink" FOR EACH ROW EXECUTE FUNCTION protect_business_short_link_identity();
