import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { Prisma } from "@prisma/client";
import { encryption } from "./helpers/commerce-encryption";

for (const mode of ["success", "retry", "revoked", "foreign-owner"]) test(`welcome outbox: ${mode}`, async () => {
  const key = Buffer.alloc(32, 4).toString("base64"), token = "a".repeat(64), lease = new Date(Date.now() + 60_000);
  const item = { merchantId: "123", businessId: "b", integrationId: "i", userId: "u", claimHash: "test-hash", welcomeLeaseUntil: lease,
    welcomeAttempts: 1, claimExpiresAt: new Date(Date.now() + 3600_000),
    user: { email: "recipient@example.test", deletedAt: null, deactivatedAt: null }, business: { deletedAt: null, ownerId: mode === "foreign-owner" ? "different" : "u" },
    integration: { status: mode === "revoked" ? "disconnected" : "active" },
    claimEnvelope: encryption.encryptCommerceCredential({ plaintext: token, encryptionKeyBase64: key, businessId: "b", integrationId: "i", provider: "salla-activation", keyVersion: "test" }) };
  let requests = 0;
  const updates: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
  const tx = { $queryRaw: async () => [{ merchantId: "123" }], sallaEasyInstallation: { update: async () => item } };
  const deps: Record<string, unknown> = { "server-only": {}, "@prisma/client": { Prisma },
    "../db": { db: { $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
      sallaEasyInstallation: { updateMany: async (input: typeof updates[number]) => { updates.push(input); return { count: 1 }; } } } },
    "../whatsapp/commerce-credential-envelope": encryption,
    "./salla-config": { getSallaConfig: () => ({ WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY: key }), sallaAppOrigin: () => "https://ir.sa" } };
  const exports: Record<string, unknown> = {};
  const source = await readFile(new URL("../app/lib/commerce/salla-welcome.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (id: string) => { assert.ok(id in deps, id); return deps[id]; }, Date, Error, AbortSignal,
      process: { env: { RESEND_API_KEY: "isolated-test-key", HEE_FROM_EMAIL: "info@example.test" } },
      fetch: async (url: string, options: { body: string; headers: Record<string, string> }) => {
        requests++; assert.equal(url, "https://api.resend.com/emails");
        const mail = JSON.parse(options.body); assert.deepEqual(mail.to, ["recipient@example.test"]);
        assert.match(mail.text, /\/salla\/activate#token=/); assert.ok(mail.text.includes(token));
        assert.equal(options.headers["Idempotency-Key"], "salla-welcome-test-hash");
        return { ok: mode === "success" };
      } });
  const result = await (exports.sendNextSallaWelcome as typeof import("../app/lib/commerce/salla-welcome").sendNextSallaWelcome)();
  assert.equal(result.processed, true);
  const update = updates.at(-1)!;
  assert.equal(update.where.merchantId, "123"); assert.equal(update.where.claimHash, "test-hash"); assert.equal(update.where.welcomeLeaseUntil, lease);
  if (mode === "success") { assert.equal(update.data.welcomeStatus, "sent"); assert.equal(update.data.claimEnvelope, Prisma.DbNull); }
  else if (mode === "retry") { assert.equal(update.data.welcomeStatus, "pending"); assert.equal(update.data.claimEnvelope, undefined); }
  else { assert.equal(requests, 0); assert.equal(update.data.welcomeStatus, "blocked"); assert.equal(update.data.claimHash, null); }
});
