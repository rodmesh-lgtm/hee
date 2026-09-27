import assert from "node:assert/strict";
import test from "node:test";
import { createSignupAttempt, EMBEDDED_SIGNUP_TTL_MS, parseSignupEvent, signupErrorMessage } from "../app/lib/whatsapp/embedded-signup-client";

const origin = "https://www.facebook.com";
const payload = (event = "FINISH") => ({ type: "WA_EMBEDDED_SIGNUP", event, data: { waba_id: "123", phone_number_id: "456" } });

test("standard and Business App completion events return the selected assets", () => {
  for (const event of ["FINISH", "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"]) {
    assert.deepEqual(parseSignupEvent(origin, payload(event)), { wabaId: "123", phoneNumberId: "456" });
    assert.deepEqual(parseSignupEvent("https://business.facebook.com", JSON.stringify(payload(event))), { wabaId: "123", phoneNumberId: "456" });
  }
});

test("untrusted origins, unrelated events and malformed payloads cannot complete signup", () => {
  for (const hostile of ["https://facebook.com.attacker.test", "http://www.facebook.com", "null", "https://ir.sa"]) assert.equal(parseSignupEvent(hostile, payload()), null);
  for (const invalid of ["{", "x".repeat(10_001), null, {}, payload("STEP"), { ...payload(), type: "OTHER" }]) assert.equal(parseSignupEvent(origin, invalid), null);
  assert.equal(parseSignupEvent(origin, { ...payload(), data: { waba_id: "123" } }), "META_SIGNUP_ASSETS_INCOMPLETE");
  assert.equal(parseSignupEvent(origin, { ...payload(), data: { waba_id: "123", phone_number_id: "not-an-id" } }), "META_SIGNUP_ASSETS_INCOMPLETE");
});

test("signup stays open beyond two minutes and times out even after assets arrive without SDK callback", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const target = new EventTarget();
  const attempt = createSignupAttempt(target);
  let expired = false;
  const deadline = attempt.expired.catch((error: Error) => { expired = true; return error.message; });
  t.mock.timers.tick(120_001);
  await Promise.resolve();
  assert.equal(expired, false);
  target.dispatchEvent(new MessageEvent("message", { origin, data: payload("FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") }));
  assert.deepEqual(await attempt.assets, { wabaId: "123", phoneNumberId: "456" });
  t.mock.timers.tick(EMBEDDED_SIGNUP_TTL_MS - 120_001);
  assert.equal(await deadline, "META_SIGNUP_TIMEOUT");
  attempt.dispose();
});

test("disposing a failed attempt removes its listener and deadline before retry", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const target = new EventTarget();
  const old = createSignupAttempt(target);
  let oldCompleted = false;
  old.assets.then(() => { oldCompleted = true; });
  old.expired.catch(() => { oldCompleted = true; });
  old.dispose();
  const next = createSignupAttempt(target);
  target.dispatchEvent(new MessageEvent("message", { origin, data: payload() }));
  assert.deepEqual(await next.assets, { wabaId: "123", phoneNumberId: "456" });
  next.dispose();
  t.mock.timers.tick(EMBEDDED_SIGNUP_TTL_MS);
  await Promise.resolve();
  assert.equal(oldCompleted, false);
});

test("cancel and provider errors are distinguished without exposing provider details", async () => {
  for (const event of ["CANCEL", "ERROR"]) {
    const target = new EventTarget();
    const attempt = createSignupAttempt(target);
    const rejected = assert.rejects(attempt.assets, new RegExp(event === "CANCEL" ? "META_SIGNUP_CANCELLED" : "META_SIGNUP_PROVIDER_ERROR"));
    target.dispatchEvent(new MessageEvent("message", { origin, data: payload(event) }));
    await rejected;
    attempt.dispose();
  }
  assert.notEqual(signupErrorMessage(new Error("META_SIGNUP_CANCELLED")), signupErrorMessage(new Error("META_SIGNUP_TIMEOUT")));
  assert.ok(!signupErrorMessage(new Error("secret-provider-response")).includes("secret-provider-response"));
});
