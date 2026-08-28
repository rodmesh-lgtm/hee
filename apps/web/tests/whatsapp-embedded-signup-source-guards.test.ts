import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const service = read("app/lib/whatsapp/embedded-signup.ts");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828053000_whatsapp_embedded_signup/migration.sql");
const client = read("app/dashboard/whatsapp/setup/embedded-signup-button.tsx");
const action = read("app/actions/whatsapp.ts");
const nextConfig = read("next.config.ts");

test("signup session is tenant and actor bound without durable plaintext state or code", () => {
  assert.match(schema, /model WhatsAppEmbeddedSignupSession/);
  assert.match(schema, /businessId\s+String/);
  assert.match(schema, /initiatedByUserId\s+String/);
  assert.match(schema, /stateDigest\s+String\s+@unique/);
  assert.doesNotMatch(schema, /authorizationCode|accessToken/);
  assert.match(migration, /FOREIGN KEY \("businessId"\)/);
  assert.match(service, /createHash\("sha256"\)/);
  assert.match(service, /stateDigest, businessId: input\.businessId, initiatedByUserId: input\.userId/);
});

test("server verifies phone ownership and blocks cross-tenant Meta asset reuse", () => {
  assert.match(service, /`\$\{wabaId\}\/phone_numbers`/);
  assert.match(service, /item\?\.id === phoneNumberId/);
  assert.match(service, /META_PHONE_NOT_OWNED_BY_WABA/);
  assert.match(service, /businessId: \{ not: input\.businessId \}/);
  assert.match(service, /WHATSAPP_ASSET_ALREADY_ASSIGNED/);
  assert.match(schema, /@@unique\(\[provider, wabaId\]/);
  assert.match(schema, /@@unique\(\[provider, phoneNumberId\]/);
});

test("tokens are encrypted immediately and never returned to the client", () => {
  assert.match(service, /encryptWhatsAppCredential/);
  assert.match(service, /credentialEnvelope: storedEnvelope/);
  assert.doesNotMatch(action, /accessToken|credentialEnvelope/);
  assert.match(service, /credentialEnvelope: Prisma\.JsonNull/);
});

test("embedded signup client accepts only exact Meta origins and backend revalidates all assets", () => {
  assert.match(client, /new Set\(\["https:\/\/www\.facebook\.com", "https:\/\/business\.facebook\.com"\]\)/);
  assert.match(client, /item\.type !== "WA_EMBEDDED_SIGNUP"/);
  assert.match(client, /item\.event !== "FINISH"/);
  assert.match(client, /completeWhatsAppEmbeddedSignupAction/);
  assert.match(service, /ASSET_ID\.test\(input\.wabaId\)/);
  assert.match(service, /ASSET_ID\.test\(input\.phoneNumberId\)/);
});

test("Meta calls are bounded, no-store, bearer authenticated, and errors exclude provider payloads", () => {
  assert.match(service, /AbortSignal\.timeout\(GRAPH_TIMEOUT_MS\)/);
  assert.match(service, /cache: "no-store"/);
  assert.match(service, /authorization: `Bearer \$\{accessToken\}`/);
  assert.match(service, /META_GRAPH_HTTP_\$\{response\.status\}/);
  assert.doesNotMatch(service, /JSON\.stringify\(payload\)|response\.text/);
});

test("browser policy narrowly permits the official Meta signup SDK and popup", () => {
  assert.match(nextConfig, /script-src[^\n]*https:\/\/connect\.facebook\.net/);
  assert.match(nextConfig, /connect-src[^\n]*https:\/\/graph\.facebook\.com/);
  assert.match(nextConfig, /frame-src 'self' https:\/\/www\.facebook\.com https:\/\/business\.facebook\.com/);
  assert.match(nextConfig, /Cross-Origin-Opener-Policy", value: "same-origin-allow-popups"/);
  assert.doesNotMatch(nextConfig, /script-src[^\n]*https:\s|connect-src[^\n]*https:\s/);
});
