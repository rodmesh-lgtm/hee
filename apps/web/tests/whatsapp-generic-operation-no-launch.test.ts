import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("generic campaign operations cannot bypass the dedicated launch readiness gate", () => {
  const action = readFileSync(new URL("../app/actions/whatsapp-marketing.ts", import.meta.url), "utf8");
  assert.match(action, /\["schedule", "pause", "resume", "cancel"\]/);
  assert.doesNotMatch(action, /operation === "launch"/);
  assert.doesNotMatch(action, /import \{ enqueueWhatsAppCampaign \}/);
});

test("campaign creation only accepts currently effective consent and active Meta configuration", () => {
  const action = readFileSync(new URL("../app/actions/whatsapp-marketing.ts", import.meta.url), "utf8");
  assert.match(action, /consentedAt: \{ lte: now \}/);
  assert.ok((action.match(/provider: "meta"/g) ?? []).length >= 2);
  assert.match(action, /disabledAt: null/);
});
