import assert from "node:assert/strict";
import test from "node:test";
import { claimStaleActionReload, isStaleServerAction } from "../app/lib/stale-action-recovery";

test("recognizes both Next.js missing-action formats without retrying ordinary failures", () => {
  assert.equal(isStaleServerAction({ name: "UnrecognizedActionError" }), true);
  assert.equal(isStaleServerAction({ message: 'Server Action "abc123" was not found on the server.' }), true);
  assert.equal(isStaleServerAction({ message: 'Failed to find Server Action "abc"' }), true);
  for (const message of ["timeout exceeded when trying to connect", "Failed to fetch", "Internal Server Error", "Request failed after payment"]) {
    assert.equal(isStaleServerAction({ message }), false);
  }
});

test("reload recovery is bounded across remounts and fails closed with unavailable storage", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  assert.equal(claimStaleActionReload(storage, 100_000), true);
  assert.equal(claimStaleActionReload(storage, 101_000), false);
  assert.equal(claimStaleActionReload(storage, 160_001), true);
  assert.equal(claimStaleActionReload({ getItem() { throw new Error("blocked"); }, setItem() {} }), false);
});
