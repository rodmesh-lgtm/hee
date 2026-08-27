import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("prisma/migrations/20260827190000_whatsapp_campaign_snapshots/migration.sql");
const snapshot = source("app/lib/whatsapp/campaign-snapshot.ts");

test("campaign, template, connection and recipients are tenant-bound in PostgreSQL", () => {
  assert.match(migration, /FOREIGN KEY \("templateId", "businessId", "connectionId"\) REFERENCES "WhatsAppTemplate"\("id", "businessId", "connectionId"\)/);
  assert.match(migration, /FOREIGN KEY \("campaignId", "businessId"\) REFERENCES "WhatsAppCampaign"\("id", "businessId"\)/);
  assert.match(migration, /FOREIGN KEY \("contactId", "businessId"\) REFERENCES "WhatsAppContact"\("id", "businessId"\)/);
});

test("recipient snapshots require active consent and exclude opted-out contacts", () => {
  assert.match(snapshot, /optedOutAt: null/);
  assert.match(snapshot, /whatsAppConsent\.findMany/);
  assert.match(snapshot, /businessId: input\.businessId/);
  assert.match(snapshot, /revokedAt: null/);
  assert.match(snapshot, /consentedAt: \{ lte: now \}/);
  assert.doesNotMatch(snapshot, /orders|bookings/);
});

test("snapshot creation is serialized, atomic and safely repeatable", () => {
  assert.match(snapshot, /FOR UPDATE/);
  assert.match(snapshot, /TransactionIsolationLevel\.Serializable/);
  assert.match(snapshot, /campaign\.status === "ready" && campaign\.snapshotAt/);
  assert.match(snapshot, /whatsAppCampaignRecipient\.createMany/);
});

test("database freezes campaign audience, template and recipient snapshots", () => {
  assert.match(migration, /WhatsAppCampaign_snapshot_immutable/);
  assert.match(migration, /WhatsAppCampaignRecipient_snapshot_immutable/);
  assert.match(migration, /NEW\."phoneE164" IS DISTINCT FROM OLD\."phoneE164"/);
  assert.match(migration, /NEW\."templateParameters" IS DISTINCT FROM OLD\."templateParameters"/);
});
