import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp hub reads section metrics from tenant-scoped records", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  for (const model of ["whatsAppContact.count", "whatsAppTemplate.count", "whatsAppCampaign.count", "whatsAppAutomation.count", "whatsAppConversation.count", "whatsAppCommerceIntegration.count"]) {
    assert.match(page, new RegExp(model.replaceAll(".", "\\.")));
  }
});
