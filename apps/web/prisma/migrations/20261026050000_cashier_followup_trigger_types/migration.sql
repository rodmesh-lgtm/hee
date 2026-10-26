-- Extend the existing allowlist; retain every prior trigger and all other constraints.
BEGIN;
ALTER TABLE "WhatsAppAutomation"
 DROP CONSTRAINT "WhatsAppAutomation_trigger_check",
 ADD CONSTRAINT "WhatsAppAutomation_trigger_check" CHECK ("triggerType" IN ('welcome','appointment_reminder','follow_up','order_update','inactive_customer','abandoned_cart','api_event','booking_confirmation','salla_order_confirmation','salla_order_status','laundry_ready','cashier_pickup_reminder','cashier_payment_reminder','cashier_review_request'));
COMMIT;
