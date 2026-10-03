import assert from "node:assert/strict";
import test from "node:test";
import { submitTemplateRequest, submissionErrorMessage, TemplateSubmissionError } from "../app/lib/whatsapp/template-submission";

const payload = { name: "booking_notice", language: "ar", category: "UTILITY", components: [{ type: "BODY", text: "تم تأكيد موعدك" }] };
const base = { url: "https://graph.facebook.com/v23.0/123/message_templates", token: "test-token", payload };
test("creation persists the Meta receipt before reporting success without a list request", async () => {
  let calls = 0; let persisted = false;
  const receipt = await submitTemplateRequest({ ...base, fetcher: async (url, options) => {
    calls++; assert.equal(url, base.url); assert.equal(options?.method, "POST");
    assert.deepEqual(JSON.parse(String(options?.body)), payload);
    return Response.json({ id: "123456", status: "PENDING", category: "UTILITY" });
  }, persist: async value => { assert.equal(value.status, "PENDING"); assert.equal(value.id, "123456"); persisted = true; } });
  assert.equal(persisted, true); assert.equal(calls, 1); assert.equal(receipt.id, "123456");
});
test("rejected provider responses do not persist a fake pending template or echo secrets", async () => {
  let persisted = false;
  await assert.rejects(submitTemplateRequest({ ...base, fetcher: async () => Response.json({ error: { code: 190, message: "secret-provider-text" } }, { status: 400 }), persist: async () => { persisted = true; } }), error => {
    assert.ok(error instanceof TemplateSubmissionError); assert.equal(error.outcome, "rejected"); assert.equal(error.reference, "190");
    assert.match(submissionErrorMessage(error), /صلاحية اتصال/); assert.ok(!String(error).includes("secret")); return true;
  });
  assert.equal(persisted, false);
});
test("timeout and malformed success are uncertain and never retried", async () => {
  for (const response of [null, {}, { success: true }]) {
    let calls = 0;
    await assert.rejects(submitTemplateRequest({ ...base, fetcher: async () => { calls++; if (!response) throw new Error("network"); return Response.json(response); }, persist: async () => { assert.fail("must not persist"); } }), error => error instanceof TemplateSubmissionError && error.outcome === "uncertain");
    assert.equal(calls, 1);
  }
});
test("successful provider submission with database failure reports accepted-unsaved", async () => {
  await assert.rejects(submitTemplateRequest({ ...base, fetcher: async () => Response.json({ id: "123", status: "PENDING" }), persist: async () => { throw new Error("database unavailable"); } }), error => error instanceof TemplateSubmissionError && error.outcome === "accepted-unsaved");
});
test("edits persist a pending receipt and never reuse old approval", async () => {
  const receipt = await submitTemplateRequest({ ...base, existingProviderId: "456", fetcher: async (_url, options) => {
    assert.deepEqual(JSON.parse(String(options?.body)), { components: payload.components, category: payload.category });
    return Response.json({ success: true });
  }, persist: async receipt => { assert.equal(receipt.status, "PENDING"); } });
  assert.equal(receipt.id, "456");
});
