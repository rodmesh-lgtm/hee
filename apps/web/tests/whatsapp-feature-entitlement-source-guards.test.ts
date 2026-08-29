import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entitlement = read("app/lib/whatsapp/feature-entitlement.ts");
const plans = read("app/lib/plan-entitlements.ts");
const actions = read("app/actions/whatsapp.ts");
const delivery = read("app/lib/whatsapp/delivery-worker.ts");
const reply = read("app/lib/whatsapp/reply-worker.ts");
const inbox = read("app/dashboard/whatsapp/inbox/page.tsx");
const setup = read("app/dashboard/whatsapp/setup/page.tsx");
const billing = read("app/dashboard/billing/manage/page.tsx");
const signup = read("app/lib/whatsapp/embedded-signup.ts");

test("WhatsApp Marketing is an explicit paid-plan feature", () => {
  assert.match(entitlement, /WHATSAPP_MARKETING_FEATURE = "whatsapp_marketing"/);
  assert.match(entitlement, /WHATSAPP_MARKETING_LABEL = "WhatsApp Marketing"/);
  assert.match(plans, /whatsappMarketing: boolean/);
  assert.match(plans, /FREE:[\s\S]*whatsappMarketing: false/);
  assert.match(plans, /BUSINESS:[\s\S]*whatsappMarketing: true/);
  assert.match(plans, /PRO:[\s\S]*whatsappMarketing: true/);
});

test("runtime entitlement requires a live subscription and supports an explicit access-code add-on grant", () => {
  assert.match(entitlement, /status: "active"/);
  assert.match(entitlement, /endsAt: \{ gt: now \}/);
  assert.match(entitlement, /provider: "access_code"/);
  assert.match(entitlement, /revokedAt: null/);
  assert.match(entitlement, /whatsappMarketingEnabled/);
  assert.match(entitlement, /subscription\.provider === "access_code"/);
  assert.doesNotMatch(entitlement, /return Boolean\(business\?\.plan\)/);
});

test("dashboard, setup and server actions fail closed without entitlement", () => {
  assert.match(actions, /getWhatsAppWriteContext/);
  assert.match(actions, /hasActiveWhatsAppMarketingEntitlement/g);
  assert.match(inbox, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(setup, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(inbox, /feature=whatsapp-marketing/);
  assert.match(setup, /feature=whatsapp-marketing/);
});

test("workers recheck entitlement immediately before outbound Meta work", () => {
  assert.match(delivery, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(reply, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(delivery, /WHATSAPP_MARKETING_ENTITLEMENT_REQUIRED/);
  assert.match(reply, /WHATSAPP_MARKETING_ENTITLEMENT_REQUIRED/);
  assert.ok(delivery.indexOf("if (!await hasActiveWhatsAppMarketingEntitlement") < delivery.indexOf("config = input.config ?? getMetaWhatsAppConfig"));
});

test("iR subscription revenue remains distinct from Meta charges", () => {
  assert.match(billing, /رسوم محادثات ورسائل Meta/);
  assert.match(billing, /لا تسجل كإيراد اشتراك iR/);
  assert.doesNotMatch(entitlement, /BillingPayment|billingPayment|amount|currency/);
});

test("Embedded Signup persists the connection status expected by every sender", () => {
  assert.match(signup, /status: "connected"/);
  assert.doesNotMatch(signup, /status: "active"/);
});
