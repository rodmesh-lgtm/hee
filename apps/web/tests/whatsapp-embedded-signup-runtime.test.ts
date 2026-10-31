import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as crypto from "node:crypto";
import ts from "typescript";

type SignupModule = typeof import("../app/lib/whatsapp/embedded-signup");
function fixture(options: { collision?: boolean; foreignPhone?: boolean; cancelled?: boolean; success?: boolean; httpError?: boolean } = {}) {
  const events: string[] = [];
  const envelope = { v: 1, alg: "aes-256-gcm", keyVersion: "1", iv: "test", ciphertext: "test", tag: "test" };
  const session = { id: "session-a", purpose: "marketing", status: "token_exchanged", expiresAt: new Date(Date.now() + 60000), credentialEnvelope: envelope, wabaId: "123", phoneNumberId: "456" };
  const tx = {
    $executeRaw: async (_strings: TemplateStringsArray, key: string) => { events.push(key); },
    whatsAppEmbeddedSignupSession: {
      updateMany: async ({ where }: { where: Record<string, unknown> }) => {
        assert.equal(where.businessId, "tenant-a"); assert.equal(where.initiatedByUserId, "actor-a");
        events.push("session-lock"); return { count: options.cancelled ? 0 : 1 };
      },
      update: async () => { events.push("session-connected"); },
    },
    whatsAppConnection: {
      findFirst: async ({ where }: { where: { businessId: { not: string } } }) => {
        assert.equal(where.businessId.not, "tenant-a"); events.push("ownership-check"); return options.collision ? { id: "foreign" } : null;
      },
      findUnique: async () => options.foreignPhone ? { id: "foreign", businessId: "tenant-b" } : null,
      updateMany: async () => { events.push("disable-previous"); },
      create: async ({ data }: { data: Record<string, unknown> }) => { assert.equal(data.businessId, "tenant-a"); events.push("connection-created"); return { id: "connection-a" }; },
    },
  };
  const dependencies: Record<string, unknown> = {
    "server-only": {}, "node:crypto": crypto, "@prisma/client": { Prisma: { JsonNull: null } },
    "../db": { db: {
      whatsAppEmbeddedSignupSession: { findFirst: async () => session, updateMany: async () => ({ count: 1 }) },
      $transaction: async (callback: (db: typeof tx) => Promise<void>, settings: { timeout: number }) => {
        assert.ok(settings.timeout > 12000); events.push("transaction"); await callback(tx); events.push("commit");
      },
    } },
    "./credential-envelope": { decryptWhatsAppCredential: () => "TEST_ONLY_TOKEN", encryptWhatsAppCredential: () => envelope },
    "./meta-config": { getMetaWhatsAppConfig: () => ({}), metaWhatsAppGraphUrl: (_config: unknown, path: string) => `https://example.invalid/${path}` },
    "./audit": { writeWhatsAppAuditLog: async () => { events.push("audit"); } },
    "./embedded-signup-client": { EMBEDDED_SIGNUP_TTL_MS: 60000 },
  };
  const exports = {};
  const source = readFileSync(new URL("../app/lib/whatsapp/embedded-signup.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: (id: string) => { assert.ok(id in dependencies, id); return dependencies[id]; }, Date, Error, AbortSignal,
    fetch: async (_url: string, init: RequestInit) => {
      if (init.method === "GET") return Response.json({ data: [{ id: "456" }] });
      events.push("meta-subscribe");
      return Response.json({ success: options.success ?? true }, { status: options.httpError ? 403 : 200 });
    },
  });
  return { events, run: () => (exports as SignupModule).completeEmbeddedSignup({ businessId: "tenant-a", userId: "actor-a", state: "s".repeat(43), authorizationCode: "test-code", wabaId: "123", phoneNumberId: "456", purpose: "marketing" }) };
}
for (const options of [{ collision: true }, { foreignPhone: true }]) {
  test(`foreign asset is rejected before any Meta subscription or connection write: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options); await assert.rejects(f.run(), /WHATSAPP_ASSET_ALREADY_ASSIGNED/);
    assert.ok(!f.events.includes("meta-subscribe")); assert.ok(!f.events.includes("disable-previous"));
  });
}
test("cancelled session cannot subscribe", async () => {
  const f = fixture({ cancelled: true }); await assert.rejects(f.run(), /WHATSAPP_SIGNUP_SESSION_INVALID/);
  assert.ok(!f.events.includes("meta-subscribe"));
});
for (const options of [{ success: false }, { httpError: true }]) {
  test(`provider failure cannot activate connection: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options); await assert.rejects(f.run(), /META_/);
    assert.ok(!f.events.includes("connection-created")); assert.ok(!f.events.includes("disable-previous")); assert.ok(!f.events.includes("commit"));
  });
}
test("valid signup checks locked ownership before subscribing and commits afterwards", async () => {
  const f = fixture(); assert.equal((await f.run()).status, "connected");
  for (const [before, after] of [["session-lock", "meta-subscribe"], ["whatsapp-waba:meta:123", "ownership-check"], ["ownership-check", "meta-subscribe"], ["meta-subscribe", "connection-created"], ["session-connected", "commit"]]) {
    assert.ok(f.events.indexOf(before) >= 0 && f.events.indexOf(before) < f.events.indexOf(after));
  }
});
