ALTER TABLE "SmartReminder"
  ADD COLUMN "workHealth" TEXT NOT NULL DEFAULT 'on_track',
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "responsiblePerson" TEXT,
  ADD COLUMN "businessDueAt" TIMESTAMP(3),
  ADD COLUMN "nextAction" TEXT;

ALTER TABLE "BusinessNote"
  ADD COLUMN "workHealth" TEXT NOT NULL DEFAULT 'on_track',
  ADD COLUMN "responsiblePerson" TEXT,
  ADD COLUMN "businessDueAt" TIMESTAMP(3);

ALTER TABLE "SmartReminder"
  ADD CONSTRAINT "SmartReminder_work_health_allowed"
    CHECK ("workHealth" IN ('on_track','at_risk','blocked')),
  ADD CONSTRAINT "SmartReminder_priority_allowed"
    CHECK ("priority" IN ('low','normal','high','urgent')),
  ADD CONSTRAINT "SmartReminder_responsible_person_length"
    CHECK ("responsiblePerson" IS NULL OR char_length("responsiblePerson") BETWEEN 1 AND 160),
  ADD CONSTRAINT "SmartReminder_next_action_length"
    CHECK ("nextAction" IS NULL OR char_length("nextAction") BETWEEN 1 AND 1200);

ALTER TABLE "BusinessNote"
  ADD CONSTRAINT "BusinessNote_work_health_allowed"
    CHECK ("workHealth" IN ('on_track','at_risk','blocked')),
  ADD CONSTRAINT "BusinessNote_responsible_person_length"
    CHECK ("responsiblePerson" IS NULL OR char_length("responsiblePerson") BETWEEN 1 AND 160);

CREATE INDEX "SmartReminder_business_health_due_idx"
  ON "SmartReminder" ("businessId", "workHealth", "businessDueAt");
CREATE INDEX "SmartReminder_business_priority_due_idx"
  ON "SmartReminder" ("businessId", "priority", "businessDueAt");
CREATE INDEX "BusinessNote_business_health_due_idx"
  ON "BusinessNote" ("businessId", "workHealth", "businessDueAt");
