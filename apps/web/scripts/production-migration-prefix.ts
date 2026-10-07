import { assertCleanPrismaMigrationHistory } from "./clean-prisma-migration-history";

export type AppliedMigration = { migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null };
export function assertProductionMigrationPrefix(local: Array<{ name: string; checksum: string }>, history: AppliedMigration[]) {
  assertCleanPrismaMigrationHistory(history);
  if (!local.length || new Set(local.map(m => m.name)).size !== local.length) throw new Error("LOCAL_MIGRATION_INVENTORY_INVALID");
  const ordered = [...local].sort((a, b) => a.name.localeCompare(b.name));
  const applied = new Map(history.filter(row => row.finished_at && !row.rolled_back_at).map(row => [row.migration_name, row.checksum]));
  for (const [name, checksum] of applied) {
    const source = ordered.find(m => m.name === name);
    if (!source) throw new Error(`APPLIED_MIGRATION_MISSING_FROM_RELEASE:${name}`);
    if (source.checksum !== checksum) throw new Error(`APPLIED_MIGRATION_CHECKSUM_CHANGED:${name}`);
  }
  let pendingStarted = false;
  const pending: string[] = [];
  for (const migration of ordered) {
    if (!applied.has(migration.name)) { pendingStarted = true; pending.push(migration.name); }
    else if (pendingStarted) throw new Error(`MIGRATION_HISTORY_NOT_A_RELEASE_PREFIX:${migration.name}`);
  }
  return pending;
}
