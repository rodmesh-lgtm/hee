import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration=readFileSync("prisma/migrations/20260906050000_add_multichannel_reminders/migration.sql","utf8");
const domain=readFileSync("app/lib/reminders/domain.ts","utf8");
const actions=readFileSync("app/actions/smart-reminders.ts","utf8");
const scheduler=readFileSync("app/lib/reminders/scheduler.ts","utf8");
const worker=readFileSync("app/lib/reminders/delivery-worker.ts","utf8");
const form=readFileSync("components/dashboard/smart-reminder-create-form.tsx","utf8");

test("multi-channel persistence is bounded and independently idempotent",()=>{assert.match(migration,/"deliveryChannels" TEXT\[\]/);assert.match(migration,/whatsapp','email','in_app/);assert.match(migration,/"channel" TEXT NOT NULL DEFAULT 'whatsapp'/);assert.match(migration,/SmartReminderDelivery_occurrence_channel_unique/);assert.match(migration,/SmartReminderNotification_delivery_unique/);assert.match(domain,/infro-reminder-v2/);assert.match(domain,/input\.channel \?\? "whatsapp"/);});
test("customer explicitly selects channels and WhatsApp keeps reminder-specific consent",()=>{assert.match(form,/name="deliveryChannels" value="whatsapp"/);assert.match(form,/name="deliveryChannels" value="email"/);assert.match(form,/name="deliveryChannels" value="in_app"/);assert.match(actions,/form\.getAll\("deliveryChannels"\)/);assert.match(actions,/wantsWhatsApp&&\(!templateId\|\|!recipientConsentAccepted\)/);});
test("scheduler fans one occurrence out to selected channels without duplicate jobs",()=>{assert.match(scheduler,/normalizeReminderChannels\(reminder\.deliveryChannels\)/);assert.match(scheduler,/for\(const channel of channels\)/);assert.match(scheduler,/reminderDeliveryIdempotencyKey\(\{businessId:reminder\.businessId,reminderId:reminder\.id,occurrenceAt:reminder\.nextOccurrenceAt,channel\}\)/);assert.match(scheduler,/ON CONFLICT \("idempotencyKey"\) DO NOTHING/);});
test("delivery routes by channel while Meta controls remain on WhatsApp",()=>{assert.match(worker,/delivery\.channel==="email"/);assert.match(worker,/https:\/\/api\.resend\.com\/emails/);assert.match(worker,/Idempotency-Key/);assert.match(worker,/delivery\.channel==="in_app"/);assert.match(worker,/SmartReminderNotification/);assert.match(worker,/delivery\.channel!=="whatsapp"/);assert.match(worker,/hasActiveWhatsAppMarketingEntitlement/);assert.match(worker,/recipientStillOwnedByBusiness/);assert.match(worker,/REMINDER_RECIPIENT_CONSENT_REQUIRED/);assert.match(worker,/templateStatus!=="approved"/);});
