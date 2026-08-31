import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("delivery queue fails closed when campaign runtime configuration is no longer launchable", () => {
  const queue = readFileSync(new URL("../app/lib/whatsapp/delivery-queue.ts", import.meta.url), "utf8");

  assert.match(queue, /templateId: true/);
  assert.match(queue, /whatsAppConnection\.findFirst/);
  assert.match(queue, /status: "connected"/);
  assert.match(queue, /whatsAppTemplate\.findFirst/);
  assert.match(queue, /status: "approved"/);
  assert.match(queue, /WHATSAPP_CAMPAIGN_CONNECTION_NOT_READY/);
  assert.match(queue, /WHATSAPP_CAMPAIGN_TEMPLATE_NOT_APPROVED/);
  assert.match(queue, /WHATSAPP_CAMPAIGN_EMPTY_SNAPSHOT/);
});

test("campaign UI treats guarded first-send states as successful operations without developer jargon", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/campaigns/page.tsx", import.meta.url), "utf8");
  assert.match(page, /"canary-launched"/);
  assert.match(page, /"canary-awaiting"/);
  assert.match(page, /بدأت الدفعة التجريبية الآمنة/);
  assert.match(page, /ننتظر الآن تأكيد التسليم من Meta/);
  assert.doesNotMatch(page, />[^<]*Canary[^<]*</i);
});
