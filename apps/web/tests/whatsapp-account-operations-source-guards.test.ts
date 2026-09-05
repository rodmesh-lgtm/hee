import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/dashboard/whatsapp/setup/page.tsx", "utf8");
const embeddedSignup = readFileSync("app/dashboard/whatsapp/setup/embedded-signup-button.tsx", "utf8");

test("account operations center stays tenant scoped and Meta-only", () => {
  assert.match(source, /businessId: context\.businessId, provider: "meta"/);
  assert.match(source, /businessId: context\.businessId/g);
  assert.match(source, /META EMBEDDED SIGNUP|WHATSAPP ACCOUNT OPERATIONS/);
  assert.match(source, /Meta Cloud API/);
  assert.match(source, /لا QR ولا WhatsApp Web/);
  assert.doesNotMatch(source, /qrcode|whatsapp-web\.js|Baileys/i);
});

test("account operations surface uses real stored connection identifiers without credentials", () => {
  for (const field of ["wabaId", "phoneNumberId", "displayPhoneNumber", "verifiedName", "connectedAt", "lastErrorCode"]) {
    assert.match(source, new RegExp(field));
  }
  assert.match(source, /WABA ID/);
  assert.match(source, /Phone Number ID/);
  assert.doesNotMatch(source, /credentialEnvelope/);
  assert.match(source, /الرموز السرية لا تظهر/);
});

test("account health is derived from connection, identity, public signup config and recent session health", () => {
  assert.match(source, /connection\?\.status === "connected" && !connection\.disabledAt/);
  assert.match(source, /identityReady/);
  assert.match(source, /Boolean\(publicConfig\)/);
  assert.match(source, /latestSession\?\.lastErrorCode/);
  assert.match(source, /healthPercent/);
});

test("embedded signup keeps trusted origins and asset validation", () => {
  assert.match(embeddedSignup, /https:\/\/www\.facebook\.com/);
  assert.match(embeddedSignup, /https:\/\/business\.facebook\.com/);
  assert.match(embeddedSignup, /WA_EMBEDDED_SIGNUP/);
  assert.match(embeddedSignup, /waba_id/);
  assert.match(embeddedSignup, /phone_number_id/);
  assert.match(embeddedSignup, /\^\\d\{1,32\}\$/);
  assert.match(embeddedSignup, /completeWhatsAppEmbeddedSignupAction/);
});
