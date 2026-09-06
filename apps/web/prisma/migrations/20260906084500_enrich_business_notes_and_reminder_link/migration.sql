-- INFRO Business Productivity Center: enrich tenant-scoped notes and create a durable tenant-safe note/reminder relation.

ALTER TABLE "BusinessNote"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "BusinessNote"
  ADD CONSTRAINT "BusinessNote_category_length_check" CHECK (char_length("category") BETWEEN 1 AND 64),
  ADD CONSTRAINT "BusinessNote_priority_check" CHECK ("priority" IN ('low','normal','high','urgent')),
  ADD CONSTRAINT "BusinessNote_status_check" CHECK ("status" IN ('draft','active','archived')),
  ADD CONSTRAINT "BusinessNote_tags_count_check" CHECK (cardinality("tags") <= 12);

CREATE INDEX "BusinessNote_business_status_updated_idx"
  ON "BusinessNote"("businessId", "status", "updatedAt" DESC);
CREATE INDEX "BusinessNote_business_category_priority_idx"
  ON "BusinessNote"("businessId", "category", "priority", "updatedAt" DESC);

ALTER TABLE "SmartReminder"
  ADD COLUMN "businessNoteId" TEXT;

CREATE INDEX "SmartReminder_business_note_idx"
  ON "SmartReminder"("businessId", "businessNoteId", "status");

ALTER TABLE "SmartReminder"
  ADD CONSTRAINT "SmartReminder_business_note_tenant_fkey"
  FOREIGN KEY ("businessNoteId", "businessId")
  REFERENCES "BusinessNote"("id", "businessId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
