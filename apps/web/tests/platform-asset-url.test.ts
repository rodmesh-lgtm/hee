import test from "node:test";
import assert from "node:assert/strict";
import { platformAssetUrl } from "../lib/platform-asset-url";

test("platform images accept local assets and HTTPS", () => {
  assert.equal(platformAssetUrl("/api/storage/asset"), "/api/storage/asset");
  assert.equal(platformAssetUrl("https://ir.sa/brand/logo.png"), "https://ir.sa/brand/logo.png");
});
test("platform image previews reject executable, malformed and protocol-relative values", () => {
  for (const url of ["javascript:alert(1)", "data:image/svg+xml,test", "//example.com/icon", "/\\example.com/icon", "http://example.com/logo", "broken", "https://user:pass@example.com/icon"]) assert.equal(platformAssetUrl(url), null, url);
});
