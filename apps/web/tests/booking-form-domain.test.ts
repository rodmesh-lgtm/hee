import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BOOKING_CATALOG, DEFAULT_BOOKING_FORM, parseBookingCatalog, bookingFormNotes } from "../app/lib/booking-form-domain";
import { bookingCandidateMinutes } from "../app/lib/booking-time";

test("default booking needs no custom answers and keeps notes optional", () => {
  assert.deepEqual(parseBookingCatalog(DEFAULT_BOOKING_CATALOG), DEFAULT_BOOKING_CATALOG);
  assert.equal(bookingFormNotes(DEFAULT_BOOKING_FORM, "", undefined), "");
  assert.equal(bookingFormNotes(DEFAULT_BOOKING_FORM, "مساعدة خاصة", {}), "مساعدة خاصة");
});
test("published custom fields validate required values, choices, unknown fields and lengths", () => {
  const form = { ...DEFAULT_BOOKING_FORM, fields: [{ id: "purpose", label: "الغرض", type: "select" as const, required: true, options: ["استشارة", "زيارة"] }] };
  assert.throws(() => bookingFormNotes(form, "", {}));
  assert.throws(() => bookingFormNotes(form, "", { purpose: "غير مسموح" }));
  assert.throws(() => bookingFormNotes(form, "", { purpose: "زيارة", hidden: "injected" }));
  assert.throws(() => bookingFormNotes(form, "x".repeat(1001), { purpose: "زيارة" }));
  assert.equal(bookingFormNotes(form, "ملاحظة", { purpose: "زيارة" }), "ملاحظة\nالغرض: زيارة");
  assert.equal(bookingFormNotes({ ...form, notesEnabled: false }, "ignored", { purpose: "زيارة" }), "الغرض: زيارة");
});
test("catalog rejects empty, duplicate or malformed forms and preserves supported fields", () => {
  assert.throws(() => parseBookingCatalog({ ...DEFAULT_BOOKING_CATALOG, forms: [] }));
  assert.throws(() => parseBookingCatalog({ ...DEFAULT_BOOKING_CATALOG, forms: [DEFAULT_BOOKING_FORM, DEFAULT_BOOKING_FORM] }));
  assert.throws(() => parseBookingCatalog({ ...DEFAULT_BOOKING_CATALOG, activeId: "missing" }));
  assert.throws(() => parseBookingCatalog({ ...DEFAULT_BOOKING_CATALOG, forms: [{ ...DEFAULT_BOOKING_FORM, fields: [{ id: "bad", label: "bad", type: "script", required: false }] }] }));
});
test("evening and non-quarter-hour windows generate starts from merchant time", () => {
  const row = { opensAt: "17:10", closesAt: "19:10", secondOpensAt: "21:05", secondClosesAt: "22:05", isClosed: false };
  assert.deepEqual(bookingCandidateMinutes(30, row, null), [1030,1060,1090,1120,1265,1295]);
  assert.deepEqual(bookingCandidateMinutes(30, { ...row, isClosed: true }, null), []);
});
test("overnight carry remains on the next calendar day and respects duration", () => {
  const row = { opensAt: "23:10", closesAt: "02:10", secondOpensAt: null, secondClosesAt: null, isClosed: false };
  assert.deepEqual(bookingCandidateMinutes(60, row, null), [1390]);
  assert.deepEqual(bookingCandidateMinutes(60, null, row), [10,70]);
  assert.deepEqual(bookingCandidateMinutes(0, row, null), []);
});
