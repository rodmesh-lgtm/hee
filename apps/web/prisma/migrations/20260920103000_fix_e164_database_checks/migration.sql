-- Correct over-escaped literal '+' checks with a character class.
-- Validate existing rows without rewriting customer or opt-out records.
BEGIN;

ALTER TABLE "CommerceBookingEligibility"
  DROP CONSTRAINT "CommerceBookingEligibility_phone_check",
  ADD CONSTRAINT "CommerceBookingEligibility_phone_check"
    CHECK ("phoneE164" IS NULL OR "phoneE164" ~ '^[+][1-9][0-9]{7,14}$');

ALTER TABLE "InfroReminderWhatsAppOptOut"
  DROP CONSTRAINT "InfroReminderWhatsAppOptOut_phone_check",
  ADD CONSTRAINT "InfroReminderWhatsAppOptOut_phone_check"
    CHECK ("phoneE164" ~ '^[+][1-9][0-9]{7,14}$');

COMMIT;
