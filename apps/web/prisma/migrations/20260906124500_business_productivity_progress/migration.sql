-- INFRO Business Productivity: progress-aware reminders and structured business notes.
-- Progress is intentionally separate from scheduling/delivery state so partially completed
-- work can remain open after the reminder notification lifecycle has completed.

ALTER TABLE "SmartReminder"
  ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "progressNote" TEXT,
  ADD COLUMN "progressUpdatedAt" TIMESTAMP(3);

ALTER TABLE "SmartReminder"
  ADD CONSTRAINT "SmartReminder_progress_percent_check" CHECK ("progressPercent" BETWEEN 0 AND 100),
  ADD CONSTRAINT "SmartReminder_progress_note_length_check" CHECK ("progressNote" IS NULL OR char_length("progressNote") <= 1000);

CREATE INDEX "SmartReminder_business_progress_idx"
  ON "SmartReminder"("businessId", "status", "progressPercent", "updatedAt" DESC);

ALTER TABLE "BusinessNote"
  ADD COLUMN "noteType" TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "outcome" TEXT,
  ADD COLUMN "nextAction" TEXT,
  ADD COLUMN "stakeholder" TEXT,
  ADD COLUMN "referenceCode" TEXT;

ALTER TABLE "BusinessNote"
  ADD CONSTRAINT "BusinessNote_type_check" CHECK ("noteType" IN ('general','meeting','decision','client','supplier','finance','operations','idea','follow_up')),
  ADD CONSTRAINT "BusinessNote_summary_length_check" CHECK ("summary" IS NULL OR char_length("summary") <= 1200),
  ADD CONSTRAINT "BusinessNote_outcome_length_check" CHECK ("outcome" IS NULL OR char_length("outcome") <= 2000),
  ADD CONSTRAINT "BusinessNote_next_action_length_check" CHECK ("nextAction" IS NULL OR char_length("nextAction") <= 1200),
  ADD CONSTRAINT "BusinessNote_stakeholder_length_check" CHECK ("stakeholder" IS NULL OR char_length("stakeholder") <= 160),
  ADD CONSTRAINT "BusinessNote_reference_code_length_check" CHECK ("referenceCode" IS NULL OR char_length("referenceCode") <= 120);

CREATE INDEX "BusinessNote_business_type_priority_idx"
  ON "BusinessNote"("businessId", "noteType", "priority", "updatedAt" DESC);
