import assert from "node:assert/strict";
import test from "node:test";
import { parseSallaCredential, rotatedSallaCredential, sallaTokenNeedsRefresh } from "../app/lib/commerce/salla-token-domain";

const now = new Date("2026-10-26T10:00:00Z");
const credential = parseSallaCredential({ accessToken: "old-access-token-123", refreshToken: "old-refresh-token-123", scope: "orders.read offline_access", accessTokenExpiresAt: "2026-10-26T10:00:30Z" });

test("Salla credentials refresh before expiry and retry legacy rejected tokens", () => {
  assert.equal(sallaTokenNeedsRefresh(credential, now), true);
  const fresh = { ...credential, accessTokenExpiresAt: "2026-10-26T11:00:00Z" };
  assert.equal(sallaTokenNeedsRefresh(fresh, now), false);
  assert.equal(sallaTokenNeedsRefresh({ ...fresh, accessTokenExpiresAt: null }, now, credential.accessToken), true);
  assert.equal(sallaTokenNeedsRefresh(fresh, now, "already-replaced-token"), false);
});

test("rotation keeps an omitted refresh token and replaces a returned rotation", () => {
  const next = rotatedSallaCredential({ access_token: "new-access-token-123", expires_in: 3600 }, credential, now);
  assert.equal(next.refreshToken, credential.refreshToken);
  assert.equal(next.scope, credential.scope);
  assert.equal(next.accessTokenExpiresAt, "2026-10-26T11:00:00.000Z");
  assert.equal(rotatedSallaCredential({ access_token: "new-access-token-123", refresh_token: "new-refresh-token-123", token_type: "Bearer", expires_in: "3600" }, credential, now).refreshToken, "new-refresh-token-123");
});

test("malformed provider responses cannot replace encrypted working credentials", () => {
  for (const payload of [null, [], {}, { access_token: "short" }, { access_token: "new-access-token-123", refresh_token: "" },
    { access_token: "new-access-token-123", expires_in: -1 }, { access_token: "new-access-token-123", expires_in: 0 },
    { access_token: "new-access-token-123", expires_in: true }, { access_token: "new-access-token-123", expires_in: [] },
    { access_token: "new-access-token-123", expires_in: 1.5 }, { access_token: "new-access-token-123", token_type: "Basic" }]) {
    assert.throws(() => rotatedSallaCredential(payload, credential, now), /^Error: SALLA_TOKEN_RESPONSE_INVALID$/);
  }
  assert.throws(() => parseSallaCredential({ accessToken: credential.accessToken, accessTokenExpiresAt: "invalid" }), /SALLA_CREDENTIAL_INVALID/);
});
