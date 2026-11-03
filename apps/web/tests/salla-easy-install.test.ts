import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import * as crypto from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import * as domain from "../app/lib/commerce/salla-authorization-domain";
import * as envelope from "../app/lib/whatsapp/commerce-credential-envelope";

const config = { SALLA_LEGACY_WEBHOOK_UTC_OFFSET: 180,
  WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"), WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION: "test" };
const payload = () => ({ event: "app.store.authorize", merchant: 12345, created_at: new Date(Date.now() - 2000).toISOString(),
  data: { access_token: "test-access-token-not-real", refresh_token: "test-refresh-token-not-real", token_type: "bearer",
    scope: "settings.read offline_access", expires: Math.floor(Date.now() / 1000) + 1209600 } });

type Row = Record<string, unknown>;
async function fixture(mode = "new") {
  const state: { users: Row[]; businesses: Row[]; integrations: Row[]; installation: Row | null; fetches: number; locked: boolean } = { users: [], businesses: [], integrations: [], installation: null, fetches: 0, locked: false };
  const owner = { id: "owner-a", email: "owner@example.test", name: "Owner", deletedAt: null, deactivatedAt: null };
  if (mode === "existing" || mode === "conflict") {
    state.integrations = [{ id: "integration-a", businessId: "business-a", status: "active", connectedAt: new Date(0), disconnectedAt: null,
      business: { id: "business-a", ownerId: owner.id, deletedAt: null, owner } }];
    if (mode === "conflict") state.integrations.push({ ...state.integrations[0], id: "integration-b", businessId: "business-b" });
  }
  const installation = { findUnique: async () => state.installation,
    upsert: async ({ create, update }: { create: Row; update: Row }) => { state.installation = state.installation ? { ...state.installation, ...update } : create; return state.installation; } };
  const tx = {
    $executeRaw: async (_strings: unknown, key: string) => { assert.equal(key, "salla-store:12345"); state.locked = true; },
    $queryRaw: async () => [], sallaEasyInstallation: installation,
    user: { findUnique: async () => null, create: async ({ data }: { data: Row }) => { assert.equal(state.locked, true); const u = { ...data, id: "new-user" }; state.users.push(u); return u; } },
    business: { create: async ({ data }: { data: Row }) => { const b = { ...data, id: "new-business" }; state.businesses.push(b); return b; } },
    whatsAppCommerceIntegration: {
      findMany: async ({ where }: { where: Row }) => { assert.equal(where.provider, "salla"); assert.equal(where.externalStoreId, "12345"); return state.integrations; },
      findUniqueOrThrow: async () => state.integrations[0],
      create: async ({ data }: { data: Row }) => { state.integrations.push(data); return data; },
      update: async ({ where, data }: { where: Row; data: Row }) => { assert.equal(where.id, "integration-a"); Object.assign(state.integrations[0], data); },
    },
  };
  const db = { sallaEasyInstallation: installation, $transaction: async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx) };
  const dependencies: Record<string, unknown> = { "server-only": {}, "node:crypto": crypto, "../db": { db },
    "../whatsapp/commerce-credential-envelope": envelope, "./salla-config": { getSallaConfig: () => config }, "./salla-authorization-domain": domain };
  const exports: Record<string, unknown> = {};
  const source = await readFile(new URL("../app/lib/commerce/salla-easy-install.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, Date, Error, JSON, AbortSignal,
      fetch: async (url: string, options: { redirect: string }) => { state.fetches++; assert.equal(url, "https://accounts.salla.sa/oauth2/user/info"); assert.equal(options.redirect, "error");
        return { ok: true, json: async () => ({ success: true, data: { email: "installer@example.test", name: "Installer", merchant: { id: mode === "foreign" ? 999 : 12345, name: "Demo store" } } }) }; } });
  return { state, run: exports.installSallaEasy as typeof import("../app/lib/commerce/salla-easy-install").installSallaEasy };
}

test("new install provisions unpublished tenant and encrypted credentials without session, password or consent", async () => {
  const f = await fixture(); await f.run(payload(), "event-1");
  assert.equal(f.state.users.length, 1); assert.equal(f.state.users[0].passwordHash, undefined); assert.equal(f.state.users[0].emailVerifiedAt, undefined);
  assert.equal(f.state.businesses[0].isPublished, false); assert.equal(f.state.businesses[0].ownerId, "new-user");
  const i = f.state.integrations[0], row = f.state.installation!;
  assert.equal(row.provisionedUser, true); assert.equal(row.businessId, i.businessId);
  const credentials = envelope.decryptCommerceCredential({ envelope: i.credentialEnvelope as envelope.CommerceCredentialEnvelope, encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
    businessId: String(i.businessId), integrationId: String(i.id), provider: "salla" });
  assert.equal(JSON.parse(credentials).accessToken, payload().data.access_token);
  assert.equal(JSON.stringify(i.credentialEnvelope).includes(payload().data.access_token), false);
  assert.throws(() => envelope.decryptCommerceCredential({ envelope: i.credentialEnvelope as envelope.CommerceCredentialEnvelope, encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
    businessId: "other-tenant", integrationId: String(i.id), provider: "salla" }));
  await f.run(payload(), "event-1");
  assert.equal(f.state.fetches, 1); assert.equal(f.state.users.length, 1);
});

test("reinstall retains existing owner even when Salla installer is another employee", async () => {
  const f = await fixture("existing"); await f.run(payload(), "event-1");
  assert.equal(f.state.installation?.userId, "owner-a"); assert.equal(f.state.installation?.businessId, "business-a");
  assert.equal(f.state.users.length, 0); assert.equal(f.state.businesses.length, 0);
});

test("merchant mismatch cannot create accounts or write tokens", async () => {
  const f = await fixture("foreign"); await assert.rejects(f.run(payload(), "event-1"), /SALLA_INSTALLER_MERCHANT_MISMATCH/);
  assert.equal(f.state.users.length, 0); assert.equal(f.state.installation, null);
});

test("ambiguous historical tenant bindings fail closed", async () => {
  const f = await fixture("conflict"); await assert.rejects(f.run(payload(), "event-1"), /SALLA_INSTALLATION_TENANT_CONFLICT/);
  assert.equal(f.state.users.length, 0); assert.equal(f.state.installation, null);
});

test("migration enforces unique merchant and tenant-bound integration foreign key", async () => {
  const pg = new PGlite();
  try {
    await pg.exec('CREATE TABLE "Business" (id TEXT PRIMARY KEY); CREATE TABLE "User" (id TEXT PRIMARY KEY); CREATE TABLE "WhatsAppCommerceIntegration" (id TEXT PRIMARY KEY, "businessId" TEXT, UNIQUE(id,"businessId")); INSERT INTO "Business" VALUES (\'a\'),(\'b\'); INSERT INTO "User" VALUES (\'u\'); INSERT INTO "WhatsAppCommerceIntegration" VALUES (\'i\',\'a\');');
    await pg.exec(await readFile(new URL("../prisma/migrations/20261103110000_salla_easy_installation/migration.sql", import.meta.url), "utf8"));
    const insert = (merchant: string, business: string) => pg.query('INSERT INTO "SallaEasyInstallation" ("merchantId","businessId","integrationId","userId","authorizedAt","eventDigest","updatedAt") VALUES ($1,$2,\'i\',\'u\',now(),\'event\',now())', [merchant,business]);
    await assert.rejects(insert("123", "b"), /foreign key/);
    await insert("123", "a"); await assert.rejects(insert("123", "a"), /unique/);
  } finally { await pg.close(); }
});
