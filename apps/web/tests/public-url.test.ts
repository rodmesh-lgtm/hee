import test from "node:test";
import assert from "node:assert/strict";
import {
  getPublicBusinessUrl,
  isReservedPublicSlug,
  isValidPublicSlug,
  normalizePublicSlug,
} from "../app/lib/public-url";

test("uses the canonical root public URL for business pages", () => {
  assert.equal(getPublicBusinessUrl("demo-store"), "https://hee.sa/demo-store");
});

test("normalizes public slugs consistently", () => {
  assert.equal(normalizePublicSlug("  Demo   Store  "), "demo-store");
  assert.equal(normalizePublicSlug("demo---store"), "demo-store");
});

test("blocks reserved app routes and protected prefixes from public business slugs", () => {
  for (const slug of ["dashboard", "login", "api-store", "auth-company", "dashboard-shop", "settings-demo"]) {
    assert.equal(isReservedPublicSlug(slug), true, slug);
    assert.equal(isValidPublicSlug(slug), false, slug);
  }
  assert.equal(isReservedPublicSlug("demo-store"), false);
  assert.equal(isValidPublicSlug("demo-store"), true);
});

test("rejects empty and too-short public slugs", () => {
  assert.equal(isValidPublicSlug(""), false);
  assert.equal(isValidPublicSlug("abc"), false);
  assert.equal(isValidPublicSlug("abcd"), true);
});
