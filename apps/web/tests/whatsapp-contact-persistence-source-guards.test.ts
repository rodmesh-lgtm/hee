import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const schema = source("prisma/schema.prisma");
const migration = source("prisma/migrations/20260827171500_whatsapp_contacts/migration.sql");

test("contacts are deduplicated only inside their owning business", () => {
  assert.match(schema, /model WhatsAppContact[\s\S]*@@unique\(\[businessId, phoneE164\]/);
  assert.match(migration, /WhatsAppContact_business_phone_unique/);
  assert.match(migration, /WhatsAppContact_phone_e164_check/);
});

test("tag and segment memberships cannot cross tenant boundaries", () => {
  assert.match(migration, /FOREIGN KEY \("contactId", "businessId"\) REFERENCES "WhatsAppContact"\("id", "businessId"\)/);
  assert.match(migration, /FOREIGN KEY \("tagId", "businessId"\) REFERENCES "WhatsAppContactTag"\("id", "businessId"\)/);
  assert.match(migration, /FOREIGN KEY \("segmentId", "businessId"\) REFERENCES "WhatsAppSegment"\("id", "businessId"\)/);
});

test("contact persistence records opt-out independently from customer existence", () => {
  assert.match(schema, /model WhatsAppContact[\s\S]*optedOutAt DateTime\?/);
  assert.doesNotMatch(schema.match(/model WhatsAppContact \{[\s\S]*?\n\}/)?.[0] ?? "", /orders|bookings/);
  assert.match(migration, /"source" IN \('manual', 'csv', 'excel', 'api', 'inbound', 'integration'\)/);
});

test("dynamic segments require an explicit definition while static segments remain snapshots", () => {
  assert.match(migration, /"kind" IN \('static', 'dynamic'\)/);
  assert.match(migration, /"kind" = 'static' AND "definition" IS NULL/);
  assert.match(migration, /"kind" = 'dynamic' AND "definition" IS NOT NULL/);
});
