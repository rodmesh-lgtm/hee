import test from "node:test";
import assert from "node:assert/strict";
import { extractStorageKeyFromUrl } from "../app/lib/storage";

const uuid = "123e4567-e89b-12d3-a456-426614174000";

test("extracts storage key from canonical relative URL", () => {
  assert.equal(extractStorageKeyFromUrl(`/api/storage/${uuid}`), uuid);
});

test("extracts storage key from absolute iR URL", () => {
  assert.equal(extractStorageKeyFromUrl(`https://ir.sa/api/storage/${uuid}?v=1`), uuid);
});

test("rejects malformed and unrelated URLs", () => {
  assert.equal(extractStorageKeyFromUrl(""), "");
  assert.equal(extractStorageKeyFromUrl("https://ir.sa/logo.png"), "");
  assert.equal(extractStorageKeyFromUrl("/api/storage/not-a-key"), "");
  assert.equal(extractStorageKeyFromUrl("not a url"), "");
});

test("does not accept a storage-like key outside the canonical route", () => {
  assert.equal(extractStorageKeyFromUrl(`/uploads/${uuid}`), "");
});
