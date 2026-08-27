import assert from "node:assert/strict";
import test from "node:test";
import { parseInboundMessages, parseStatusReceipts } from "../app/lib/whatsapp/webhook-message-parser";

test("parses inbound text without trusting optional contact metadata", () => {
  const [message] = parseInboundMessages({
    contacts: [{ wa_id: "966500000000", profile: { name: "عميل" } }],
    messages: [{ id: "wamid.inbound", from: "966500000000", timestamp: "1724774400", type: "text", text: { body: "مرحبا" } }],
  });
  assert.equal(message.providerMessageId, "wamid.inbound");
  assert.equal(message.customerDisplayName, "عميل");
  assert.equal(message.textBody, "مرحبا");
});

test("accepts only supported delivery lifecycle receipts and captures provider failure", () => {
  const receipts = parseStatusReceipts({ statuses: [
    { id: "wamid.1", status: "read", timestamp: "1724774400" },
    { id: "wamid.2", status: "failed", errors: [{ code: 131026, title: "Undeliverable" }] },
    { id: "wamid.3", status: "invented" },
  ] });
  assert.equal(receipts.length, 2);
  assert.equal(receipts[0].status, "read");
  assert.equal(receipts[1].errorCode, "131026");
});

test("malformed webhook value fails closed to no domain events", () => {
  assert.deepEqual(parseInboundMessages(null), []);
  assert.deepEqual(parseStatusReceipts({ statuses: "not-an-array" }), []);
});
