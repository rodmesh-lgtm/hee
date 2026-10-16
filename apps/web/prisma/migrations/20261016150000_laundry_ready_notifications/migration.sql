BEGIN;
ALTER TABLE "LaundryTicket" ADD COLUMN "readyNotifyConsentAt" TIMESTAMPTZ;
ALTER TABLE "WhatsAppAutomation" DROP CONSTRAINT "WhatsAppAutomation_trigger_check",
 ADD CONSTRAINT "WhatsAppAutomation_trigger_check" CHECK ("triggerType" IN ('welcome','appointment_reminder','follow_up','order_update','inactive_customer','abandoned_cart','api_event','booking_confirmation','salla_order_confirmation','salla_order_status','laundry_ready'));
CREATE UNIQUE INDEX "WhatsAppAutomation_one_laundry_ready" ON "WhatsAppAutomation" ("businessId") WHERE "triggerType"='laundry_ready';
COMMIT;
