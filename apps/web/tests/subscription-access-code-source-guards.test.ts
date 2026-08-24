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

test("access codes do not replace a live paid, trial, or past-due subscription",()=>{
 const source=read("app/lib/subscription-access-code.ts");
 assert.match(source,/status: \{ in: \["active", "trialing", "past_due"\] \}/);
 assert.match(source,/return "subscription-conflict"/);
 assert.doesNotMatch(source,/subscription\.updateMany/);
});

test("revoked grants cannot be silently redeemed again",()=>{
 const source=read("app/lib/subscription-access-code.ts");
 assert.match(source,/if \(prior\?\.revokedAt\) return "revoked"/);
 assert.match(source,/redemptionCount: \{ increment: 1 \}/);
});

test("admin revocation uses a database-allowed terminal subscription status",()=>{
 const source=read("app/actions/admin-access-code.ts");
 assert.match(source,/status:"canceled"/);
 assert.doesNotMatch(source,/status:"revoked"/);
});
