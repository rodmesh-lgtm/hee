import test from "node:test";
import assert from "node:assert/strict";
import { getPublicBusinessUrl, isReservedPublicSlug } from "../app/lib/public-url";

test("uses the canonical root public URL for business pages", () => {
  assert.equal(getPublicBusinessUrl("demo-store"), "https://hee.sa/demo-store");
});

test("blocks reserved app routes from becoming public business slugs", () => {
  assert.equal(isReservedPublicSlug("dashboard"), true);
  assert.equal(isReservedPublicSlug("login"), true);
  assert.equal(isReservedPublicSlug("demo-store"), false);
});
