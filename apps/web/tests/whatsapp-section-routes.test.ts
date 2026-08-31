import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");

for (const route of [
  "/dashboard/whatsapp/contacts",
  "/dashboard/whatsapp/templates",
  "/dashboard/whatsapp/campaigns",
  "/dashboard/whatsapp/automations",
  "/dashboard/whatsapp/integrations",
  "/dashboard/whatsapp/inbox",
  "/dashboard/whatsapp/setup",
  "/dashboard/whatsapp/audit",
]) {
  test(`WhatsApp hub links to ${route}`, () => assert.match(page, new RegExp(route.replaceAll("/", "\\/"))));
}
