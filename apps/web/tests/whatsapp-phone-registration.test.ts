import test from "node:test";
import assert from "node:assert/strict";
import { inspectRegistration, registerPhone, PhoneRegistrationError, registrationFailureReason } from "../app/lib/whatsapp/phone-registration-provider";
const input = { version: "v23.0", token: "private-token", wabaId: "123", phoneNumberId: "456", pin: "012345" };
const pending = { id: "456", status: "PENDING", code_verification_status: "VERIFIED", platform_type: "CLOUD_API", is_on_biz_app: false };
test("registration error classification never exposes raw Meta messages or PINs", () => {
  assert.equal(registrationFailureReason({ code: 100, message: "Invalid parameter", error_data: { details: "Invalid account linking. private-token 012345" } }), "account_linking_pending");
  assert.equal(registrationFailureReason({ code: 100, message: "Missing permission private-token" }), "registration_permission_missing");
  assert.equal(registrationFailureReason({ code: 100, message: "private-token 012345" }), "meta_100");
  assert.equal(registrationFailureReason({ code: "private-token", message: "012345" }), "registration_failed");
  assert.equal(registrationFailureReason({ code: 100, message: "Invalid parameter", error_user_msg: "Invalid account linking" }), "account_linking_pending");
});
function provider(phone = pending, send = () => Response.json({ success: true })) {
  let posts = 0;
  return { get posts() { return posts; }, fetcher: async (address: unknown, init?: RequestInit) => {
    assert.ok(String(address).startsWith("https://graph.facebook.com/v23.0/"));
    assert.equal(init?.redirect, "error");
    if (init?.method === "POST") { posts++; assert.equal(String(address), "https://graph.facebook.com/v23.0/456/register"); assert.deepEqual(JSON.parse(String(init.body)), { messaging_product: "whatsapp", pin: "012345" }); return send(); }
    return Response.json(String(address).includes("/phone_numbers?") ? { data: [{ id: "456" }] } : phone);
  } };
}
test("registration proves ownership and verification, then makes one explicit POST", async () => {
  const fake = provider();
  assert.equal(await inspectRegistration({ ...input, fetcher: fake.fetcher }), "needs_registration");
  assert.equal(await registerPhone({ ...input, fetcher: fake.fetcher }), "registered");
  assert.equal(fake.posts, 1);
});
test("connected Cloud API numbers are not registered again or given a new PIN", async () => {
  const fake = provider({ ...pending, status: "CONNECTED" });
  assert.equal(await registerPhone({ ...input, fetcher: fake.fetcher }), "registered");
  assert.equal(fake.posts, 0);
});
test("unverified, business-app and on-premise numbers are never migrated by this action", async () => {
  for (const phone of [{ ...pending, code_verification_status: "NOT_VERIFIED" }, { ...pending, is_on_biz_app: true }, { ...pending, platform_type: "ON_PREMISE" }, { ...pending, status: "BLOCKED" }]) {
    const fake = provider(phone);
    await assert.rejects(registerPhone({ ...input, fetcher: fake.fetcher }), PhoneRegistrationError);
    assert.equal(fake.posts, 0);
  }
});
test("unknown asset and malformed PIN fail before registration", async () => {
  const fake = provider({ ...pending, id: "999" });
  await assert.rejects(registerPhone({ ...input, fetcher: fake.fetcher }), PhoneRegistrationError);
  await assert.rejects(registerPhone({ ...input, pin: "bad", fetcher: fake.fetcher }), PhoneRegistrationError);
  assert.equal(fake.posts, 0);
  await assert.rejects(inspectRegistration({ ...input, fetcher: async () => Response.json({ data: [{ id: "999" }] }) }), PhoneRegistrationError);
});
test("provider rejection and uncertain registration are redacted and never retried", async () => {
  for (const send of [() => Response.json({ error: { code: 133005, message: "private-token" } }, { status: 400 }), () => { throw new Error("private-token"); }, () => Response.json({})]) {
    const fake = provider(pending, send);
    await assert.rejects(registerPhone({ ...input, fetcher: fake.fetcher }), error => error instanceof PhoneRegistrationError && !error.message.includes(input.token) && !error.message.includes(input.pin));
    assert.equal(fake.posts, 1);
  }
});
test("registration retains safe Meta support references without raw provider text", async () => {
  const fake = provider(pending, () => Response.json({ error: { code: 100, error_subcode: 2593006, fbtrace_id: "Meta_trace_123", message: "private-token 012345" } }, { status: 400 }));
  await assert.rejects(registerPhone({ ...input, fetcher: fake.fetcher }), error => {
    assert.ok(error instanceof PhoneRegistrationError);
    assert.deepEqual(error.diagnostic, { subcode: 2593006, traceId: "Meta_trace_123" });
    assert.ok(!JSON.stringify(error).includes(input.token));
    assert.ok(!JSON.stringify(error).includes(input.pin));
    return true;
  });
  assert.equal(fake.posts, 1);
});
test("malformed Meta diagnostic fields are omitted", async () => {
  const fake = provider(pending, () => Response.json({ error: { code: 100, error_subcode: "private-token", fbtrace_id: "<unsafe text>" } }, { status: 400 }));
  await assert.rejects(registerPhone({ ...input, fetcher: fake.fetcher }), error => error instanceof PhoneRegistrationError && error.diagnostic.subcode === undefined && error.diagnostic.traceId === undefined);
});
