import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const action = readFileSync(join(root, "app/actions/account-deletion.ts"), "utf8");
const page = readFileSync(join(root, "app/dashboard/account-deletion/page.tsx"), "utf8");
const support = readFileSync(join(root, "app/actions/support.ts"), "utf8");
const supportPage = readFileSync(join(root, "app/dashboard/support/page.tsx"), "utf8");

test("self-service deletion requires authenticated verified ownership and explicit confirmation", () => {
  assert.match(action, /getCurrentUserForWrites\(\)/);
  assert.match(action, /!user\.emailVerifiedAt/);
  assert.match(action, /email !== user\.email\.toLowerCase\(\)/);
  assert.match(action, /confirmation !== CONFIRMATION/);
  assert.match(action, /isAdminEmail\(user\.email\)/);
});

test("deletion revokes access, publication, renewals and reusable payment methods", () => {
  assert.match(action, /session\.deleteMany\(\{ where: \{ userId: user\.id \} \}\)/);
  assert.match(action, /autoRenew: false/);
  assert.match(action, /billingPaymentMethod\.updateMany/);
  assert.match(action, /status: "revoked"/);
  assert.match(action, /subscriptionAccessGrant\.updateMany/);
  assert.match(action, /isPublished: false/);
  assert.match(action, /deletedAt: now/);
  assert.match(action, /passwordHash: null/);
});

test("deletion retains financial history and writes an audit event instead of hard deleting ledgers", () => {
  assert.match(action, /eventType: DELETION_EVENT/);
  assert.match(action, /retainedRecordClasses/);
  assert.match(action, /BillingPayment/);
  assert.doesNotMatch(action, /billingPayment\.delete/);
  assert.doesNotMatch(action, /subscription\.delete/);
  assert.doesNotMatch(action, /customer\.delete/);
  assert.doesNotMatch(action, /order\.delete/);
});

test("privacy support cannot claim deletion completion without lifecycle proof", () => {
  assert.match(support, /DELETION_EVENT = "account_deletion_completed"/);
  assert.match(support, /deletion-proof-required/);
  assert.match(support, /deletionLifecycleEventId/);
  assert.match(support, /candidate.*userId/s);
});

test("customers can reach the deletion lifecycle from privacy support", () => {
  assert.match(supportPage, /href="\/dashboard\/account-deletion"/);
  assert.match(page, /DELETE MY HEE ACCOUNT/);
  assert.match(page, /deleteOwnAccountAction/);
});
