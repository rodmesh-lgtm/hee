import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nav = readFileSync(new URL("../components/dashboard/dashboard-nav.ts", import.meta.url), "utf8");
const tools = readFileSync(new URL("../app/dashboard/tools/page.tsx", import.meta.url), "utf8");
const support = readFileSync(new URL("../app/dashboard/support/page.tsx", import.meta.url), "utf8");

test("ready iR tools are discoverable from dashboard navigation", () => {
  assert.match(tools, /مصمم العروض/);
  assert.match(tools, /designerAvailable/);
  assert.match(nav, /"\/dashboard\/tools"/);
});

test("customer-facing support history uses the platform Riyadh timezone", () => {
  assert.match(support, /timeZone:"Asia\/Riyadh"/);
  assert.match(support, /supportDateTime\(ticket\.createdAt\)/);
});
