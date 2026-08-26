import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");

test("access codes are stored only as hashes and serialized on redemption",()=>{
 const source=read("app/lib/subscription-access-code.ts");
 assert.match(source,/createHash\("sha256"\)/);
 assert.match(source,/pg_advisory_xact_lock/);
 assert.match(source,/billing-business:/);
 assert.match(source,/codeHash/);
 assert.doesNotMatch(read("prisma/migrations/20260824110000_subscription_access_codes/migration.sql"),/"code" TEXT/);
});

test("access code activation never fabricates a paid billing ledger entry",()=>{
 const source=read("app/lib/subscription-access-code.ts");
 assert.match(source,/provider: "access_code"/);
 assert.match(source,/autoRenew: false/);
 assert.doesNotMatch(source,/billingPayment\.create|BillingPayment[\s\S]*INSERT/i);
 assert.match(source,/endsAt: null/);
});

test("access codes do not replace a live paid, trial, past-due, or open paid checkout",()=>{
 const source=read("app/lib/subscription-access-code.ts");
 assert.match(source,/status: \{ in: \["active", "trialing", "past_due"\] \}/);
 assert.match(source,/kind: \{ in: \["initial", "upgrade"\] \}/);
 assert.match(source,/status: \{ in: \["created", "initiated", "authorized"\] \}/);
 assert.match(source,/return "subscription-conflict"/);
 assert.doesNotMatch(source,/subscription\.updateMany/);
});

test("database rejects paid checkout while an access-code entitlement is active",()=>{
 const migration=read("prisma/migrations/20260824141000_serialize_access_codes_with_paid_checkout/migration.sql");
 assert.match(migration,/prevent_paid_checkout_over_access_code/);
 assert.match(migration,/NEW\."kind" IN \('initial', 'upgrade'\)/);
 assert.match(migration,/s\."provider" = 'access_code'/);
 assert.match(migration,/g\."revokedAt" IS NULL/);
 assert.match(migration,/c\."isActive" = true/);
 assert.match(migration,/BEFORE INSERT OR UPDATE/);
});

test("admin revocation serializes against redemption and billing before disabling the code",()=>{
 const source=read("app/actions/admin-access-code.ts");
 assert.match(source,/subscription-access:\$\{identity\.codeHash\}/);
 assert.match(source,/billing-business:\$\{businessId\}/);
 const codeLock=source.indexOf("subscription-access:${identity.codeHash}");
 const businessLock=source.indexOf("billing-business:${businessId}");
 const disable=source.indexOf("subscriptionAccessCode.update");
 assert.ok(codeLock >= 0 && businessLock > codeLock && disable > businessLock);
 assert.match(source,/new Set\(code\.grants\.map\(\(grant\) => grant\.businessId\)\)\]\.sort\(\)/);
});

test("revoked grants cannot be silently redeemed again",()=>{
 const source=read("app/lib/subscription-access-code.ts");
 assert.match(source,/if \(prior\?\.revokedAt\) return "revoked"/);
 assert.match(source,/redemptionCount: \{ increment: 1 \}/);
});

test("admin revocation uses a database-allowed terminal subscription status",()=>{
 const source=read("app/actions/admin-access-code.ts");
 assert.match(source,/status:\s*"canceled"/);
 assert.doesNotMatch(source,/status:\s*"revoked"/);
});
