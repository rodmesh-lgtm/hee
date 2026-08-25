import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nav = readFileSync(new URL("../components/dashboard/dashboard-nav.ts", import.meta.url), "utf8");
const tools = readFileSync(new URL("../app/dashboard/tools/page.tsx", import.meta.url), "utf8");

test("ready HEE tools are discoverable from dashboard navigation", () => {
  assert.match(tools, /مصمم العروض/);
  assert.match(tools, /designerAvailable/);
  assert.match(nav, /label: "أدوات HEE", href: "\/dashboard\/tools"/);
});
