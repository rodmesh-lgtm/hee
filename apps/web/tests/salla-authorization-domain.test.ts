import assert from "node:assert/strict";
import test from "node:test";
import { parseSallaAuthorization, sallaAuthorizationIsStale } from "../app/lib/commerce/salla-authorization-domain";
import { sallaWebhookStoragePayload } from "../app/lib/commerce/salla-webhook-storage";

const now = new Date("2026-11-03T09:00:00Z");
const payload = { event: "app.store.authorize", merchant: 12345, created_at: "2026-11-03 12:00:00", data: {
  access_token: "test-access-token-not-real", refresh_token: "test-refresh-token-not-real",
  token_type: "bearer", scope: "settings.read offline_access", expires: 1794906000,
} };
const parse = (input: unknown) => parseSallaAuthorization(input, now);

test("Easy OAuth expiry is an absolute epoch, not a duration", () => {
  const result = parse(payload);
  assert.equal(result.merchantId, "12345");
  assert.equal(result.authorizedAt.toISOString(), now.toISOString());
  assert.equal(result.credential.accessTokenExpiresAt, new Date(payload.data.expires * 1000).toISOString());
  assert.equal(parse({ ...payload, data: { ...payload.data, expires: String(payload.data.expires) } }).credential.accessTokenExpiresAt,
    result.credential.accessTokenExpiresAt);
});

test("reject invalid, expired and millisecond expiration without echoing credentials", () => {
  for (const expires of [null, true, "1e10", 1209600, 1794906000000, -1, 1.5, Infinity]) {
    assert.throws(() => parse({ ...payload, data: { ...payload.data, expires } }), /^Error: SALLA_AUTHORIZATION_EXPIRY_INVALID$/);
  }
});

test("require refresh token, bearer, and offline access", () => {
  for (const change of [{ refresh_token: null }, { access_token: "a\r\nb" }, { token_type: "basic" }, { scope: "settings.read" }]) {
    assert.throws(() => parse({ ...payload, data: { ...payload.data, ...change } }), /SALLA_AUTHORIZATION_(CREDENTIAL|SCOPE)_INVALID/);
  }
});

test("reject wrong event, malformed merchant identities and unsafe numeric IDs", () => {
  assert.throws(() => parse({ ...payload, event: "app.installed" }), /SALLA_AUTHORIZATION_INVALID/);
  for (const merchant of [null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "123/other", " 123", {}, "01"]) {
    assert.throws(() => parse({ ...payload, merchant }), /SALLA_AUTHORIZATION_INVALID/);
  }
});

test("require valid provider timestamp without accepting future authorization", () => {
  for (const created_at of [null, "2026-02-30 12:00:00", "2026-11-03T10:00:00Z"]) {
    assert.throws(() => parse({ ...payload, created_at }), /SALLA_AUTHORIZATION_DATE_INVALID/);
  }
});

test("duplicate authorization cannot undo token rotation or a later uninstall", () => {
  const earlier = new Date(now.getTime() - 1000), later = new Date(now.getTime() + 1000);
  assert.equal(sallaAuthorizationIsStale(now, now, null), true);
  assert.equal(sallaAuthorizationIsStale(earlier, now, null), true);
  assert.equal(sallaAuthorizationIsStale(now, earlier, now), true);
  assert.equal(sallaAuthorizationIsStale(now, earlier, later), true);
  assert.equal(sallaAuthorizationIsStale(later, now, earlier), false);
  assert.equal(sallaAuthorizationIsStale(now, null, null), false);
});

test("authorization tokens stay out of the ordinary event inbox", () => {
  const stored = JSON.stringify(sallaWebhookStoragePayload(payload, payload.event, "12345"));
  assert.equal(stored.includes(payload.data.access_token), false);
  assert.equal(stored.includes(payload.data.refresh_token), false);
});
