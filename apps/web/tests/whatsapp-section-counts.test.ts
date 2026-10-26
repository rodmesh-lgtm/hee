import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp hub reads section metrics from tenant-scoped records", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  const query = readFileSync(new URL("../app/lib/whatsapp/hub-counts-query.ts", import.meta.url), "utf8");
  assert.match(page,/whatsappHubCountsQuery\(context.businessId\)/);
  for (const model of ["WhatsAppContact", "WhatsAppTemplate", "WhatsAppCampaign", "WhatsAppAutomation", "WhatsAppConversation", "WhatsAppCommerceIntegration"]) assert.ok(query.includes(`"${model}"`));
});
