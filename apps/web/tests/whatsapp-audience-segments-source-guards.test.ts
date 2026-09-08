import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const action = readFileSync(new URL("../app/actions/whatsapp-audience-segments.ts", import.meta.url), "utf8");

test("segment creation is RBAC, entitlement and tenant scoped", () => {
  assert.match(action, /getWhatsAppWriteContext\("campaign\.manage"\)/);
  assert.match(action, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(action, /businessId: context\.businessId/g);
  assert.match(action, /contact\."businessId" = \$\{context\.businessId\}/);
  assert.match(action, /consent\."businessId" = contact\."businessId"/);
});

test("segment membership snapshots only currently eligible audience", () => {
  assert.match(action, /contact\."optedOutAt" IS NULL/);
  assert.match(action, /consent\."revokedAt" IS NULL/);
  assert.match(action, /consent\."consentedAt" <= CURRENT_TIMESTAMP/);
  assert.match(action, /INNER JOIN "WhatsAppConsent"/);
  assert.match(action, /ON CONFLICT \("contactId", "segmentId"\) DO NOTHING/);
});

test("segment creation is bounded, normalized, transactional and audited", () => {
  assert.match(action, /MAX_STATIC_SEGMENTS = 100/);
  assert.match(action, /normalizeContactLabel/);
  assert.match(action, /TransactionIsolationLevel\.Serializable/);
  assert.match(action, /WHATSAPP_SEGMENT_EMPTY_AUDIENCE/);
  assert.match(action, /audience\.segment\.create/g);
  assert.doesNotMatch(action, /phoneE164.*metadata/);
});
