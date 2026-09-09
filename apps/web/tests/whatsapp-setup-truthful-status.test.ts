import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/whatsapp/setup/page.tsx", import.meta.url), "utf8");

test("setup page does not present disabled or non-connected Meta connection as active", () => {
  assert.match(page, /disabledAt: true/);
  assert.match(page, /connection\?\.status\s*===\s*"connected"\s*&&\s*!connection\.disabledAt/);
  assert.match(page, /identityReady = Boolean\(connected && connection\?\.verifiedName && connection\?\.displayPhoneNumber\)/);
  assert.match(page, /connection\.disabledAt \? "الربط متوقف"/);
  assert.match(page, /ready: connected/);
  assert.match(page, /connected && approvedTemplates > 0/);
});

test("setup page explains official linking without exposing credentials or fake transport", () => {
  assert.match(page, /مركز حساب واتساب/);
  assert.match(page, /بدء الربط الرسمي/);
  assert.match(page, /Meta Cloud API/);
  assert.match(page, /لا QR ولا WhatsApp Web/);
  assert.match(page, /لم تكتمل آخر محاولة ربط/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /WABA ID/);
  assert.match(page, /Phone Number ID/);
  assert.match(page, /الرموز السرية لا تظهر/);
  assert.doesNotMatch(page, /credentialEnvelope|accessToken|authorizationCode/);
  assert.doesNotMatch(page, /qrcode|whatsapp-web\.js|Baileys/i);
});

test("account operations derives session guidance without leaking provider error codes", () => {
  assert.match(page, /latestSession\?\.lastErrorCode/);
  assert.match(page, /signupStatusLabel\(latestSession\.status\)/);
  assert.match(page, /latestSession\.consumedAt/);
  assert.match(page, /latestSession\.expiresAt < new Date\(\)/);
  assert.doesNotMatch(page, />\{connection\.lastErrorCode\}</);
  assert.doesNotMatch(page, />\{latestSession\.lastErrorCode\}</);
});
