import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp hub remains a real server-backed page", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  assert.match(page, /getWhatsAppReadContext/);
  assert.match(page, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(page, /Promise\.all/);
});
