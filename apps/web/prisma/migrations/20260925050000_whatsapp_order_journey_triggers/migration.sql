-- Expand the existing allowlist for implemented, consent-gated automation sources.
-- Preserve every existing trigger and all tenant, action and status constraints.
BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE "WhatsAppAutomation"
  DROP CONSTRAINT "WhatsAppAutomation_trigger_check",
  ADD CONSTRAINT "WhatsAppAutomation_trigger_check" CHECK (
    "triggerType" IN (
      'welcome', 'appointment_reminder', 'follow_up', 'order_update',
      'inactive_customer', 'abandoned_cart', 'api_event',
      'booking_confirmation', 'salla_order_confirmation', 'salla_order_status'
    )
  );
COMMIT;
