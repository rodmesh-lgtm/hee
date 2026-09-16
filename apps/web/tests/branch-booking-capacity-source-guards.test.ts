import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(new URL("../prisma/migrations/20260916190000_add_branch_booking_slots/migration.sql", import.meta.url), "utf8");
const capacityMigration = readFileSync(new URL("../prisma/migrations/20260916223000_allow_branch_slot_capacity/migration.sql", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/public/bookings/route.ts", import.meta.url), "utf8");
const action = readFileSync(new URL("../app/actions/working-hours.ts", import.meta.url), "utf8");
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

test("public booking capacity is branch-scoped serialized and rechecked at commit", () => {
  assert.match(route, /booking-slot:\$\{business\.id\}:\$\{selectedBranch\?\.id \?\? "business"\}:\$\{bookingDate\}:\$\{bookingTime\}/);
  assert.match(route, /b\."branchId"/);
  assert.match(route, /occupiedSeats >= currentCapacity/);
  assert.match(route, /PUBLIC_BOOKING_SLOT_FULL/);
  assert.match(route, /slotEndTime:/);
});

test("visitor selects a branch and sees range capacity and remaining seats", () => {
  assert.match(launcher, /aria-label="الفرع"/);
  assert.match(launcher, /مدة الفترة/);
  assert.match(launcher, /متبقي \{slot\.remaining\} من \{slot\.capacity\}/);
  assert.match(launcher, /branchId: values\.branchId/);
});
