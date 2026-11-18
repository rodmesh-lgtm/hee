import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { calendarDate, calendarStatus, calendarWindow, riyadhCalendarDate } from "../app/lib/appointment-calendar";
import { appointmentCalendarQueries, type CalendarRow, type CalendarCount } from "../app/lib/appointment-calendar-query";

test("calendar uses Riyadh midnight and rejects invalid dates without normalizing into another month", () => {
  assert.equal(riyadhCalendarDate(new Date("2026-11-18T21:30:00Z")), "2026-11-19");
  for (const value of ["2026-02-29", "2026-02-30", "2026-13-01", "bad", "2026-2-01", "1999-12-31", null]) assert.equal(calendarDate(value, "2026-11-18"), "2026-11-18");
  assert.equal(calendarDate("2028-02-29"), "2028-02-29");
  assert.equal(calendarStatus("confirmed"), "confirmed");
  assert.equal(calendarStatus("made_up"), "");
});
test("calendar weeks start Sunday and safely cross month, year and leap-day boundaries", () => {
  const week = calendarWindow("2027-01-01", "week");
  assert.equal(week.start, "2026-12-27");
  assert.equal(week.end, "2027-01-03");
  assert.equal(week.days.length, 7);
  assert.equal(calendarWindow("2028-02-29", "day").next, "2028-03-01");
  assert.equal(calendarWindow("2026-11-15", "week").start, "2026-11-15");
});
test("calendar SQL isolates tenants, retains durations, carries overnight visits and paginates each day", async t => {
  const pg = new PGlite();
  const defaults = { businessId: "a", date: "2026-11-18", view: "day" as const, branchId: "", validBranch: true, search: "", status: "", page: 1 };
  const read = async (changes: Partial<typeof defaults> = {}) => {
    const q = appointmentCalendarQueries({ ...defaults, ...changes });
    return { rows: (await pg.query<CalendarRow>(q.rows.text, q.rows.values)).rows, counts: (await pg.query<CalendarCount>(q.counts.text, q.counts.values)).rows };
  };
  try {
    await pg.exec(`CREATE TABLE "Customer" (id text PRIMARY KEY, "businessId" text, name text, phone text);
      CREATE TABLE "Service" (id text PRIMARY KEY, "businessId" text, name text, "durationMinutes" int);
      CREATE TABLE "Branch" (id text PRIMARY KEY, "businessId" text, name text);
      CREATE TABLE "Booking" (id text PRIMARY KEY, "businessId" text, "customerId" text, "serviceId" text, "branchId" text, "bookingDate" text, "bookingTime" text, status text);
      CREATE TABLE "BookingDurationSnapshot" ("bookingId" text PRIMARY KEY, "durationMinutes" int);
      INSERT INTO "Customer" VALUES ('ca','a','عميل %_','0500000001'),('cb','b','FOREIGN CUSTOMER','0500000002');
      INSERT INTO "Service" VALUES ('sa','a','خدمة',15),('sb','b','FOREIGN SERVICE',120);
      INSERT INTO "Branch" VALUES ('ba','a','فرع أ'),('bb','b','FOREIGN BRANCH');
      INSERT INTO "Booking" VALUES
        ('overnight','a','ca','sa','ba','2026-11-17','23:30','confirmed'),
        ('boundary','a','ca','sa',NULL,'2026-11-17','23:45','completed'),
        ('no-show','a','ca','sa',NULL,'2026-11-18','09:00','no_show'),
        ('next-midnight','a','ca','sa',NULL,'2026-11-19','00:00','pending'),
        ('foreign','b','cb','sb','bb','2026-11-18','10:00','confirmed'),
        ('wrong-customer','a','cb','sa',NULL,'2026-11-18','10:00','pending'),
        ('wrong-joins','a','ca','sb','bb','2026-11-18','11:00','cancelled');
      INSERT INTO "BookingDurationSnapshot" VALUES ('overnight',60);`);
    await t.test("overnight snapshots override an edited service; exact-midnight endpoints are excluded", async () => {
      const { rows } = await read();
      assert.deepEqual(rows.map(row => row.id), ["overnight", "no-show", "wrong-joins"]);
      assert.equal(new Date(rows[0].endsAt).toISOString(), "2026-11-17T21:30:00.000Z");
      assert.equal(rows.find(row => row.id === "wrong-joins")?.serviceName, null);
      assert.equal(rows.find(row => row.id === "wrong-joins")?.branchName, null);
      assert.ok(!JSON.stringify(rows).includes("FOREIGN"));
    });
    await t.test("foreign or invalid branches never widen to all branches", async () => {
      assert.equal((await read({ branchId: "bb", validBranch: false })).rows.length, 0);
      assert.deepEqual((await read({ branchId: "ba" })).rows.map(row => row.id), ["overnight"]);
      assert.deepEqual((await read({ branchId: "main" })).rows.map(row => row.id), ["no-show"]);
    });
    await t.test("status and literal wildcard search filter within the tenant", async () => {
      assert.deepEqual((await read({ status: "no_show" })).rows.map(row => row.id), ["no-show"]);
      assert.equal((await read({ search: "%_" })).rows.length, 3);
      assert.equal((await read({ search: "FOREIGN" })).rows.length, 0);
      assert.equal((await read({ search: "' OR true --" })).rows.length, 0);
    });
    await pg.exec(`INSERT INTO "Booking" SELECT 'busy-' || n, 'a','ca','sa','ba','2026-11-18','12:00','pending' FROM generate_series(1,30) n;`);
    await t.test("daily pages are stable and show accurate untruncated counts", async () => {
      const first = await read(); const second = await read({ page: 2 });
      assert.equal(first.counts[0].count, 33);
      assert.equal(first.rows.length, 25); assert.equal(second.rows.length, 8);
      assert.equal(new Set([...first.rows, ...second.rows].map(row => row.id)).size, 33);
    });
    await t.test("weekly limits apply per day and preserve counts for the open-day link", async () => {
      const q = appointmentCalendarQueries({ ...defaults, view: "week" });
      const counts = (await pg.query<CalendarCount>(q.counts.text, q.counts.values)).rows;
      const rows = (await pg.query<CalendarRow>(q.rows.text, q.rows.values)).rows;
      assert.equal(counts.find(row => row.day === "2026-11-18")?.count, 33);
      assert.equal(rows.filter(row => row.day === "2026-11-18").length, 10);
      assert.ok(rows.some(row => row.day === "2026-11-17" && row.id === "overnight"));
      assert.ok(rows.some(row => row.day === "2026-11-18" && row.id === "overnight"));
    });
  } finally { await pg.close(); }
});
