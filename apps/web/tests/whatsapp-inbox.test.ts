import assert from "node:assert/strict";
import test from "node:test";
import { whatsAppCustomerServiceWindow } from "../app/lib/whatsapp/inbox-domain";

test("customer service window is open only for 24 hours after the latest inbound message", () => {
  const now = new Date("2026-08-28T12:00:00.000Z");
  assert.equal(whatsAppCustomerServiceWindow(new Date("2026-08-27T12:00:01.000Z"), now).open, true);
  assert.equal(whatsAppCustomerServiceWindow(new Date("2026-08-27T12:00:00.000Z"), now).open, false);
  assert.equal(whatsAppCustomerServiceWindow(null, now).open, false);
});
