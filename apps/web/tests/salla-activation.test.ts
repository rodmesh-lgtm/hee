import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { randomUUID, createHash } from "node:crypto";
import ts from "typescript";
import { Prisma } from "@prisma/client";

async function fixture(mode = "new") {
  const item = { merchantId: "123", userId: "u", provisionedUser: true, claimedAt: null,
    claimExpiresAt: new Date(Date.now() + 3600000), integration: { status: "active" }, business: { ownerId: "u", deletedAt: null },
    user: { passwordHash: null as string | null, deletedAt: null, deactivatedAt: null, _count: { authIdentities: 0 } } };
  if (mode === "existing") { item.provisionedUser = false; item.user.passwordHash = "existing-hash"; }
  if (mode === "oauth") item.user._count.authIdentities = 1;
  if (mode === "foreign") item.business.ownerId = "someone-else";
  if (mode === "revoked") item.integration.status = "disconnected";
  if (mode === "expired") item.claimExpiresAt = new Date(0);
  const state = { passwordWrites: 0, consents: 0, consumed: false };
  const tx = {
    $queryRaw: async () => state.consumed ? [] : [{ merchantId: "123" }],
    $executeRaw: async () => { state.consents++; return 1; },
    sallaEasyInstallation: { findUniqueOrThrow: async () => item, update: async () => { state.consumed = true; } },
    user: { findUniqueOrThrow: async () => item.user, update: async () => { state.passwordWrites++; } },
  };
  const deps: Record<string, unknown> = { "node:crypto": { randomUUID }, "@prisma/client": { Prisma }, "next/headers": { headers: async () => new Headers() },
    "../../lib/db": { db: { $transaction: async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx) } },
    "../../lib/auth": { getCurrentUserForApiWrite: async () => null, hashPassword: async () => "hashed-test-password" },
    "../../lib/rate-limit": { consumePublicWriteLimit: async () => ({ allowed: true }) },
    "../../lib/legal": { TERMS_VERSION: "test", PRIVACY_VERSION: "test" },
    "../../lib/commerce/salla-easy-install": { sallaClaimHash: (t: string) => createHash("sha256").update(t).digest("hex") } };
  const exports: Record<string, unknown> = {};
  const source = await readFile(new URL("../app/salla/activate/action.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (id: string) => { assert.ok(id in deps, id); return deps[id]; }, Date, Error, process: { env: { SALLA_EASY_MODE_ENABLED: "true" } } });
  const form = new FormData(); form.set("token", "a".repeat(64)); form.set("agreed", "on"); form.set("password", "Test12345!"); form.set("confirmPassword", "Test12345!");
  return { state, form, activate: exports.activateSallaAccount as typeof import("../app/salla/activate/action").activateSallaAccount };
}

test("new activation consumes link once and records actual terms acceptance", async () => {
  const f = await fixture(); assert.equal((await f.activate({}, f.form)).success, true);
  assert.equal(f.state.passwordWrites, 1); assert.equal(f.state.consents, 1);
  assert.ok((await f.activate({}, f.form)).error); assert.equal(f.state.passwordWrites, 1);
});
test("activation never resets an existing password or OAuth-only account", async () => {
  for (const mode of ["existing", "oauth"]) { const f = await fixture(mode); assert.ok((await f.activate({}, f.form)).error); assert.equal(f.state.passwordWrites, 0); assert.equal(f.state.consumed, false); }
});
test("foreign ownership, disconnected integration and expired links cannot activate", async () => {
  for (const mode of ["foreign", "revoked", "expired"]) { const f = await fixture(mode); assert.ok((await f.activate({}, f.form)).error); assert.equal(f.state.passwordWrites, 0); assert.equal(f.state.consents, 0); }
});
test("activation cannot fabricate consent", async () => {
  const f = await fixture(); f.form.delete("agreed"); assert.ok((await f.activate({}, f.form)).error); assert.equal(f.state.passwordWrites, 0); assert.equal(f.state.consents, 0);
});
