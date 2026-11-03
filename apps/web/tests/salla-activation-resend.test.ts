import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import * as crypto from "node:crypto";
import ts from "typescript";
import { Prisma } from "@prisma/client";
import { encryption } from "./helpers/commerce-encryption";
import type { CommerceCredentialEnvelope } from "../app/lib/whatsapp/commerce-credential-envelope";

test("resend is rate limited, hides account existence and rotates only the matching active tenant", async () => {
  const source = await readFile(new URL("../app/salla/activate/resend.ts", import.meta.url), "utf8");
  const script = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const messages = new Set<string>();
  for (const mode of ["active", "missing", "rate-limited", "foreign", "revoked"]) {
    let writes = 0;
    const tx = { $queryRaw: async () => [], sallaEasyInstallation: {
      findUniqueOrThrow: async () => ({ merchantId: "123", businessId: "b", integrationId: "i", userId: "u", claimedAt: null,
        user: { email: "owner@example.test", deletedAt: null, deactivatedAt: null },
        business: { deletedAt: null, ownerId: mode === "foreign" ? "other-user" : "u" }, integration: { status: mode === "revoked" ? "disconnected" : "active" } }),
      update: async ({ data }: { data: { claimHash: string; claimEnvelope: CommerceCredentialEnvelope; claimExpiresAt: Date } }) => {
        writes++; assert.match(data.claimHash, /^[0-9a-f]{64}$/); assert.ok(data.claimExpiresAt > new Date());
        const token = encryption.decryptCommerceCredential({ envelope: data.claimEnvelope, encryptionKeyBase64: Buffer.alloc(32, 9).toString("base64"), businessId: "b", integrationId: "i", provider: "salla-activation" });
        assert.equal(crypto.createHash("sha256").update(token).digest("hex"), data.claimHash);
        assert.equal(JSON.stringify(data.claimEnvelope).includes(token), false);
      } } };
    const deps: Record<string, unknown> = { "node:crypto": crypto, "@prisma/client": { Prisma },
      "next/headers": { headers: async () => new Headers() }, "../../lib/db": { db: { $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
        sallaEasyInstallation: { findFirst: async () => mode === "missing" ? null : { merchantId: "123" } } } },
      "../../lib/rate-limit": { consumePublicWriteLimit: async () => ({ allowed: mode !== "rate-limited" }) },
      "../../lib/commerce/salla-easy-install": { sallaClaimHash: (t: string) => crypto.createHash("sha256").update(t).digest("hex") },
      "../../lib/commerce/salla-config": { getSallaConfig: () => ({ WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"), WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION: "test" }) },
      "../../lib/whatsapp/commerce-credential-envelope": encryption,
      "../../lib/commerce/salla-welcome": { sendNextSallaWelcome: async () => ({ processed: false }) } };
    const exports: Record<string, unknown> = {};
    runInNewContext(script, { exports, require: (id: string) => { assert.ok(id in deps, id); return deps[id]; }, Date,
      process: { env: { SALLA_EASY_MODE_ENABLED: "true" } } });
    const form = new FormData(); form.set("email", "owner@example.test");
    const result = await (exports.resendSallaActivation as typeof import("../app/salla/activate/resend").resendSallaActivation)({}, form);
    messages.add(result.message); assert.equal(writes, mode === "active" ? 1 : 0);
  }
  assert.equal(messages.size, 1);
});
