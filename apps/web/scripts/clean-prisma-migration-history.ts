type MigrationState = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

export function assertCleanPrismaMigrationHistory(rows: MigrationState[]) {
  if (!rows.length) throw new Error("Restored database does not contain Prisma migration history");

  const appliedByName = new Map<string, number>();
  for (const row of rows) {
    if (row.rolled_back_at) continue;
    if (!row.finished_at) {
      throw new Error(`Prisma migration history contains an unresolved failed migration: ${row.migration_name}`);
    }
    appliedByName.set(row.migration_name, (appliedByName.get(row.migration_name) ?? 0) + 1);
  }

  for (const name of new Set(rows.map((row) => row.migration_name))) {
    const applied = appliedByName.get(name) ?? 0;
    if (applied !== 1) {
      throw new Error(`Prisma migration history must contain exactly one successful application for ${name}`);
    }
  }
}
