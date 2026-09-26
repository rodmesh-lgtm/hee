import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(new URL("../prisma/migrations/20260916190000_add_branch_booking_slots/migration.sql", import.meta.url), "utf8");
const capacityMigration = readFileSync(new URL("../prisma/migrations/20260916223000_allow_branch_slot_capacity/migration.sql", import.meta.url), "utf8");
const legacyActivationMigration = readFileSync(new URL("../prisma/migrations/20260917083000_activate_legacy_booking_services/migration.sql", import.meta.url), "utf8");
const bookingHoursMigration = readFileSync(new URL("../prisma/migrations/20260917084500_initialize_booking_hours/migration.sql", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/public/bookings/route.ts", import.meta.url), "utf8");
const action = readFileSync(new URL("../app/actions/working-hours.ts", import.meta.url), "utf8");
const serviceActions = readFileSync(new URL("../app/actions/services.ts", import.meta.url), "utf8");
const launcher = readFileSync(new URL("../components/public/public-transaction-launcher.tsx", import.meta.url), "utf8");

test("branch booking settings support flexible quarter-hour slots and bounded capacity", () => {
  assert.match(schema, /bookingSlotMinutes Int @default\(120\)/);
  assert.match(schema, /bookingCapacity Int @default\(10\)/);
  assert.match(migration, /"bookingSlotMinutes" BETWEEN 15 AND 480/);
  assert.match(migration, /"bookingCapacity" BETWEEN 1 AND 500/);
  assert.match(capacityMigration, /DROP INDEX IF EXISTS "Booking_active_service_slot_unique"/);
  assert.match(capacityMigration, /Booking_branch_slot_capacity_lookup_idx/);
  assert.match(action, /slotMinutes % 15/);
});

test("existing booking businesses and their first service cannot remain stuck in setup", () => {
  assert.match(legacyActivationMigration, /business\."bookingAvailable" = true/);
  assert.match(legacyActivationMigration, /NOT EXISTS/);
  assert.match(legacyActivationMigration, /SET\s+"bookingEnabled" = true/);
  assert.match(serviceActions, /business\.bookingAvailable && bookableCount === 0/);
  assert.match(serviceActions, /if \(bookableCount === 0\)/);
  assert.match(serviceActions, /data: \{ bookingEnabled: true \}/);
  assert.match(bookingHoursMigration, /generate_series\(0, 6\)/);
  assert.match(bookingHoursMigration, /'08:00'/);
  assert.match(bookingHoursMigration, /'18:00'/);
  assert.match(serviceActions, /ensureDefaultBookingHours/);
});

test("public booking capacity is branch-scoped serialized and rechecked at commit", () => {
  assert.match(route, /booking-slot:\$\{business\.id\}:\$\{selectedBranch\?\.id \?\? "business"\}:\$\{bookingDate\}:\$\{bookingTime\}/);
  assert.match(route, /b\."branchId"/);
  assert.match(route, /occupiedSeats >= currentCapacity/);
  assert.match(route, /PUBLIC_BOOKING_SLOT_FULL/);
  assert.match(route, /slotEndTime:/);
});

test("visitor selects a branch without seeing capacity or remaining seats", () => {
  assert.match(launcher, /aria-label="الفرع"/);
  assert.match(launcher, /مدة الفترة/);
  assert.match(launcher, /متاح للحجز/);
  assert.doesNotMatch(launcher, /slot\.remaining/);
  assert.doesNotMatch(launcher, /slot\.capacity/);
  assert.match(route, /const publicBranchSummaries = publicBranches\.map/);
  assert.doesNotMatch(route, /branches: publicBranches[,}]/);
  assert.doesNotMatch(route, /slotDetails\.push\(\{[^}]*capacity/);
  assert.match(launcher, /branchId: values\.branchId/);
});

test("booking dialog keeps its form inside the responsive modal width", () => {
  assert.match(launcher, /overflow-x-hidden overflow-y-auto/);
  // The simplified form retains one width-bounded contact input: phone.
  assert.equal((launcher.match(/grid min-w-0 gap-1\.5 text-xs font-bold text-slate-600/g) ?? []).length, 1);
  assert.equal((launcher.match(/h-11 min-w-0 w-full rounded-xl/g) ?? []).length, 1);
});
