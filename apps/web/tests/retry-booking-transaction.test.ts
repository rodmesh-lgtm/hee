import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { retryBookingTransaction } from "../app/lib/retry-booking-transaction";

const conflict = () => new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "test" });

test("booking retry returns only the committed transaction result", async () => {
  let attempts = 0;
  const result = await retryBookingTransaction(async () => {
    if (++attempts < 3) throw conflict();
    return { bookingId: "committed", confirmationEventId: "single-event" };
  });
  assert.equal(attempts, 3);
  assert.deepEqual(result, { bookingId: "committed", confirmationEventId: "single-event" });
});

test("booking retry stops after three serialization conflicts", async () => {
  let attempts = 0;
  const error = conflict();
  await assert.rejects(retryBookingTransaction(async () => { attempts += 1; throw error; }), value => value === error);
  assert.equal(attempts, 3);
});

test("booking retry preserves capacity and eligibility rejection without retrying", async () => {
  for (const error of [new Error("PUBLIC_BOOKING_SLOT_FULL"), new Error("PUBLIC_BOOKING_CUSTOMER_INELIGIBLE"), new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "test" })]) {
    let attempts = 0;
    await assert.rejects(retryBookingTransaction(async () => { attempts += 1; throw error; }), value => value === error);
    assert.equal(attempts, 1);
  }
});

// Raw SQL row locks report SQLSTATE through P2010 instead of P2034.
// Both states below guarantee PostgreSQL rolled back the transaction.
test("booking retry recognizes raw SQL serialization and deadlock rollbacks", async () => {
  for (const code of ["40001", "40P01"]) {
    let attempts = 0;
    const result = await retryBookingTransaction(async () => {
      if (++attempts === 1) throw new Prisma.PrismaClientKnownRequestError("rolled back", {code:"P2010",clientVersion:"test",meta:{code}});
      return "committed once";
    });
    assert.equal(result,"committed once");
    assert.equal(attempts,2);
  }
});
test("booking retry never replays other raw SQL failures or uncertain connectivity", async () => {
  for (const code of ["23505", "08006", "57014", undefined]) {
    let attempts = 0;
    const error = new Prisma.PrismaClientKnownRequestError("do not retry", {code:"P2010",clientVersion:"test",meta:{code}});
    await assert.rejects(retryBookingTransaction(async () => { attempts++; throw error; }),value=>value===error);
    assert.equal(attempts,1);
  }
});
