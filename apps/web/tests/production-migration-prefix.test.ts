import assert from "node:assert/strict";
import test from "node:test";
import { assertProductionMigrationPrefix } from "../scripts/production-migration-prefix";

const local = [{ name: "20260101000000_first", checksum: "a" }, { name: "20260201000000_second", checksum: "b" }];
const row = (index: number) => ({ migration_name: local[index].name, checksum: local[index].checksum, finished_at: new Date(), rolled_back_at: null });
test("migration precheck permits a clean pending tail and an up-to-date database", () => {
  assert.deepEqual(assertProductionMigrationPrefix(local, [row(0)]), [local[1].name]);
  assert.deepEqual(assertProductionMigrationPrefix(local, [row(0), row(1)]), []);
});
test("migration precheck refuses failed, duplicate, changed, divergent and non-prefix histories", () => {
  assert.throws(() => assertProductionMigrationPrefix(local, []));
  assert.throws(() => assertProductionMigrationPrefix(local, [{ ...row(0), finished_at: null }]));
  assert.throws(() => assertProductionMigrationPrefix(local, [row(0), row(0)]));
  assert.throws(() => assertProductionMigrationPrefix(local, [{ ...row(0), checksum: "changed" }]), /CHECKSUM_CHANGED/);
  assert.throws(() => assertProductionMigrationPrefix(local, [{ ...row(0), migration_name: "unknown" }]), /MISSING_FROM_RELEASE/);
  assert.throws(() => assertProductionMigrationPrefix(local, [row(1)]), /NOT_A_RELEASE_PREFIX/);
  assert.throws(() => assertProductionMigrationPrefix(local, [{ ...row(0), rolled_back_at: new Date() }]));
  assert.deepEqual(assertProductionMigrationPrefix(local, [{ ...row(0), finished_at: null, rolled_back_at: new Date() }, row(0)]), [local[1].name]);
});
