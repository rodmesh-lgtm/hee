import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../prisma/migrations/20260830040000_seed_canonical_business_plans/migration.sql", import.meta.url),
  "utf8",
);

test("Production migration installs the complete canonical plan catalog", () => {
  assert.match(migration, /'FREE'/);
  assert.match(migration, /'BUSINESS'/);
  assert.match(migration, /'PRO'/);
  assert.match(migration, /ON CONFLICT \("code"\) DO UPDATE/);
  assert.match(migration, /"isActive" = true/);
});

test("Catalog repair preserves ids of plans that already exist", () => {
  assert.doesNotMatch(migration, /"id"\s*=\s*EXCLUDED\."id"/);
  assert.doesNotMatch(migration, /DELETE FROM "BusinessPlan"/);
});
