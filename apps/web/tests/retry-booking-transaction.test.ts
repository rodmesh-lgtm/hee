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
