import test from "node:test";
import assert from "node:assert/strict";
import { bookingVerificationFailure } from "../app/lib/booking-verification-diagnostics";

test("owner diagnostics expose only numeric Meta reasons, never raw metadata", () => {
  assert.match(bookingVerificationFailure({ reason: "meta_131042", code: "secret-otp" }), /131042/);
  for (const reason of ["meta_131042 secret-token", "secret-otp", "__proto__", "constructor", null]) {
    const result = bookingVerificationFailure({ reason, body: "secret-body" });
    assert.equal(typeof result, "string");
    assert.doesNotMatch(result, /secret|__proto__|constructor/);
  }
});
