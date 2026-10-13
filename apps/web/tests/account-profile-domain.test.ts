import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAccountPhone, accountCodeHash, accountCodeMatches } from "../app/lib/account-profile-domain";

test("normalizes Saudi local, Arabic and international account numbers without treating them as verified", () => {
  for (const value of ["055 123 4567", "٠٥٥١٢٣٤٥٦٧", "+966551234567", "00966551234567"]) assert.equal(normalizeAccountPhone(value), "+966551234567");
  assert.equal(normalizeAccountPhone("+44 7911 123456"), "+447911123456");
  assert.equal(normalizeAccountPhone(""), null);
  for (const value of ["055123", "9660551234567", "<script>", "0000"]) assert.throws(() => normalizeAccountPhone(value));
});

test("email codes are bound to the request and mailbox, including leading zeros", () => {
  const hash = accountCodeHash("request-a", "current", "001234");
  assert.equal(accountCodeMatches("request-a", "current", "001234", hash), true);
  assert.equal(accountCodeMatches("request-a", "new", "001234", hash), false);
  assert.equal(accountCodeMatches("request-b", "current", "001234", hash), false);
  assert.equal(accountCodeMatches("request-a", "current", "001235", hash), false);
  assert.equal(accountCodeMatches("request-a", "current", "1234", hash), false);
});
