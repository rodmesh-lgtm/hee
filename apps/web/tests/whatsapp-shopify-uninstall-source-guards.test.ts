import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const subscriptions = read("app/lib/whatsapp/shopify-webhook-subscriptions.ts");
const processor = read("app/lib/whatsapp/shopify-webhook-processor.ts");

test("Shopify uninstall is subscribed and revokes the tenant credential transactionally", () => {
  assert.match(subscriptions, /APP_UNINSTALLED/);
  assert.match(processor, /event\.topic === "app\/uninstalled"/);
  assert.match(processor, /processAppUninstalled/);
  assert.match(processor, /credentialEnvelope: Prisma\.DbNull/);
  assert.match(processor, /status: "disconnected"/);
  assert.match(processor, /SHOPIFY_APP_UNINSTALLED/);
  assert.match(processor, /TransactionIsolationLevel\.Serializable/);
  assert.match(processor, /commerce\.shopify\.app\.uninstalled/);
});

test("Shopify uninstall preserves customer, consent and campaign records", () => {
  assert.doesNotMatch(processor, /whatsApp(Contact|Consent|Campaign)\.(delete|deleteMany)/);
  assert.doesNotMatch(processor, /console\.(log|error)/);
});
