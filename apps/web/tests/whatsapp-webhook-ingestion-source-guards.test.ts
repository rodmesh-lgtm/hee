import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Meta webhook verifies the raw request before JSON parsing", () => {
  const route = source("app/api/whatsapp/meta/webhook/route.ts");
  const verifyAt = route.indexOf("verifyMetaWebhookSignature");
  const parseAt = route.indexOf("JSON.parse(rawBody)");
  assert.ok(verifyAt >= 0 && parseAt > verifyAt);
  assert.match(route, /x-hub-signature-256/);
  assert.match(route, /readBoundedText\(request, MAX_WEBHOOK_BYTES\)/);
});

test("Meta webhook resolves both WABA and phone number before assigning tenant", () => {
  const route = source("app/api/whatsapp/meta/webhook/route.ts");
  assert.match(route, /where: \{ provider: "meta", wabaId, phoneNumberId, disabledAt: null \}/);
  assert.match(route, /businessId: connection\.businessId/);
  assert.doesNotMatch(route, /businessId:\s*wabaId|businessId:\s*phoneNumberId/);
});

test("Meta webhook deduplicates the exact signed body/change without trusting client event ids", () => {
  const route = source("app/api/whatsapp/meta/webhook/route.ts");
  assert.match(route, /createHash\("sha256"\)\.update\(rawBody/);
  assert.match(route, /providerEventId = `\$\{bodyDigest\}:\$\{entryIndex\}:\$\{changeIndex\}`/);
  assert.match(route, /provider_providerEventId/);
  assert.match(route, /update: \{\}/);
});

test("signature and verification-token comparisons are timing safe", () => {
  const security = source("app/lib/whatsapp/webhook-security.ts");
  assert.match(security, /createHmac\("sha256"/);
  assert.match(security, /timingSafeEqual/);
  assert.match(security, /sha256=/);
});
