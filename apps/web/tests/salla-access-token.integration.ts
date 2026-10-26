// Run: node --conditions=react-server --import tsx --test tests/salla-access-token.integration.ts
import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { getSallaAccessToken } from "../app/lib/commerce/salla-access-token";
import { decryptCommerceCredential, encryptCommerceCredential } from "../app/lib/whatsapp/commerce-credential-envelope";

process.env.SALLA_CLIENT_ID = "test-client-123456";
process.env.SALLA_CLIENT_SECRET = "test-client-secret-123456";
process.env.SALLA_WEBHOOK_SECRET = "test-webhook-secret-123456";
process.env.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION = "test-v1";
const context = { businessId: "test-business", integrationId: "test-integration", provider: "salla", encryptionKeyBase64: process.env.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY };
const now = new Date("2026-10-26T10:00:00Z");

function fixture(options: { revokedBeforeLock?: boolean; response?: unknown; networkError?: boolean } = {}) {
  let encrypted = encryptCommerceCredential({ ...context, keyVersion: "test-v1", plaintext: JSON.stringify({ accessToken: "old-access-token-123", refreshToken: "old-refresh-token-123", accessTokenExpiresAt: "2026-10-26T09:00:00Z" }) });
  const original = encrypted;
  let calls = 0;
  let tail = Promise.resolve();
  const matches = (where: Record<string, unknown>) => where.id === context.integrationId && where.businessId === context.businessId && where.provider === "salla" && where.status === "active";
  const model = {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => matches(where) ? { credentialEnvelope: encrypted } : null,
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: { credentialEnvelope: typeof encrypted } }) => {
      assert.ok(matches(where)); encrypted = data.credentialEnvelope; return { count: 1 };
    },
  };
  const database = {
    whatsAppCommerceIntegration: model,
    $transaction: async (operation: (tx: unknown) => Promise<string>, settings: { timeout: number }) => {
      assert.ok(settings.timeout > 12_000);
      const pending = tail;
      let release!: () => void;
      tail = new Promise<void>(resolve => { release = resolve; });
      await pending;
      try { return await operation({ whatsAppCommerceIntegration: model,
        $queryRaw: async (sql: { values: unknown[] }) => {
          assert.ok(sql.values.includes(context.businessId));
          assert.ok(sql.values.includes(context.integrationId));
          return options.revokedBeforeLock ? [] : [{ credentialEnvelope: encrypted }];
        } });
      } finally { release(); }
    },
  } as unknown as Pick<PrismaClient, "whatsAppCommerceIntegration" | "$transaction">;
  const fetcher = (async (url: unknown, init: RequestInit) => {
    calls++;
    assert.equal(url, "https://accounts.salla.sa/oauth2/token");
    assert.equal(init.redirect, "error");
    assert.equal(new URLSearchParams(init.body as URLSearchParams).get("grant_type"), "refresh_token");
    if (options.networkError) throw new Error("PRIVATE_PROVIDER_RESPONSE");
    return Response.json(options.response ?? { access_token: "new-access-token-123", refresh_token: "new-refresh-token-123", expires_in: 3600 });
  }) as typeof fetch;
  return { database, fetcher, calls: () => calls, original, envelope: () => encrypted,
    read: () => JSON.parse(decryptCommerceCredential({ ...context, envelope: encrypted })) };
}

test("concurrent Salla refreshes rotate once and persist only encrypted tenant-bound credentials", async () => {
  const f = fixture();
  const input = { ...context, database: f.database, fetcher: f.fetcher, now };
  assert.deepEqual(await Promise.all([getSallaAccessToken(input), getSallaAccessToken(input)]), ["new-access-token-123", "new-access-token-123"]);
  assert.equal(f.calls(), 1);
  assert.equal(f.read().refreshToken, "new-refresh-token-123");
  assert.doesNotMatch(JSON.stringify(f.envelope()), /new-access-token|new-refresh-token/);
  assert.throws(() => decryptCommerceCredential({ ...context, businessId: "other-business", envelope: f.envelope() }), /COMMERCE_CREDENTIAL_DECRYPT_FAILED/);
  await assert.rejects(getSallaAccessToken({ ...input, businessId: "other-business" }), /SALLA_INTEGRATION_UNAVAILABLE/);
  assert.equal(f.calls(), 1);
});

test("revocation before refresh lock prevents any credential transmission", async () => {
  const f = fixture({ revokedBeforeLock: true });
  await assert.rejects(getSallaAccessToken({ ...context, database: f.database, fetcher: f.fetcher, now }), /SALLA_INTEGRATION_UNAVAILABLE/);
  assert.equal(f.calls(), 0);
  assert.equal(f.envelope(), f.original);
});

test("network and malformed-token failures preserve previous ciphertext without exposing provider errors", async () => {
  for (const options of [{ networkError: true }, { response: { access_token: "short", error: "PRIVATE_PROVIDER_RESPONSE" } }]) {
    const f = fixture(options);
    await assert.rejects(getSallaAccessToken({ ...context, database: f.database, fetcher: f.fetcher, now }), /^Error: SALLA_TOKEN_(REFRESH_UNAVAILABLE|RESPONSE_INVALID)$/);
    assert.equal(f.envelope(), f.original);
  }
});
