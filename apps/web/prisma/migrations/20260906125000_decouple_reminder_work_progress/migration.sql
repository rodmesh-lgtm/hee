-- Reminder scheduling/delivery lifecycle and business-work completion are distinct concerns.
-- A one-time reminder can finish sending while the underlying business task is still open.

ALTER TABLE "SmartReminder"
  DROP CONSTRAINT IF EXISTS "SmartReminder_completed_progress_check";

ALTER TABLE "SmartReminder"
  ADD COLUMN "workCompletedAt" TIMESTAMP(3);

ALTER TABLE "SmartReminder"
  ADD CONSTRAINT "SmartReminder_work_completion_consistency_check" CHECK (
    ("progressPercent" = 100 AND "workCompletedAt" IS NOT NULL)
    OR
    ("progressPercent" < 100 AND "workCompletedAt" IS NULL)
  );

CREATE INDEX "SmartReminder_business_work_completion_idx"
  ON "SmartReminder"("businessId", "workCompletedAt", "progressUpdatedAt" DESC);
