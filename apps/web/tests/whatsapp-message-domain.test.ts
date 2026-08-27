import assert from "node:assert/strict";
import test from "node:test";
import { metaTimestampToDate, nextWhatsAppMessageStatus } from "../app/lib/whatsapp/message-domain";

test("delivery receipts advance monotonically despite out-of-order webhooks", () => {
  assert.equal(nextWhatsAppMessageStatus("sent", "delivered"), "delivered");
  assert.equal(nextWhatsAppMessageStatus("delivered", "sent"), "delivered");
  assert.equal(nextWhatsAppMessageStatus("read", "delivered"), "read");
});

test("failure is terminal and inbound receipt is not rewritten by delivery statuses", () => {
  assert.equal(nextWhatsAppMessageStatus("sent", "failed"), "failed");
  assert.equal(nextWhatsAppMessageStatus("failed", "read"), "failed");
  assert.equal(nextWhatsAppMessageStatus("received", "read"), "received");
});

test("Meta timestamps are parsed defensively", () => {
  assert.equal(metaTimestampToDate("1724774400")?.toISOString(), "2024-08-27T16:00:00.000Z");
  assert.equal(metaTimestampToDate("not-a-timestamp"), null);
  assert.equal(metaTimestampToDate(-1), null);
});
