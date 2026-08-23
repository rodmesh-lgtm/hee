import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("revoked reusable payment tokens are tombstoned centrally at the database boundary", () => {
  const migration = source("prisma/migrations/20260823055500_scrub_revoked_payment_tokens/migration.sql");

  assert.match(migration, /UPDATE "BillingPaymentMethod"/);
  assert.match(migration, /WHERE "status" = 'revoked'/);
  assert.match(migration, /"encryptedToken" = 'revoked'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION "hee_scrub_revoked_billing_token"/);
  assert.match(migration, /IF NEW\."status" = 'revoked'/);
  assert.match(migration, /NEW\."encryptedToken" := 'revoked'/);
  assert.match(migration, /BEFORE INSERT OR UPDATE ON "BillingPaymentMethod"/);
});

test("application renewal charging can decrypt only an active same-tenant payment method", () => {
  const worker = source("scripts/billing-renewal-worker.ts");
  assert.match(worker, /pm\."status"='active'/);
  assert.match(worker, /pm\."businessId"=s\."businessId"/);
  assert.match(worker, /decryptProviderToken\(encryptedToken\)/);
});
