import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../app/actions/admin-access-code.ts", import.meta.url), "utf8");

describe("admin access-code plan identifiers", () => {
  it("preserves the exact persisted plan code instead of uppercasing it", () => {
    assert.ok(source.includes('const planCode = String(formData.get("plan") ?? "").trim();'));
    assert.ok(!source.includes('String(formData.get("plan") ?? "").trim().toUpperCase()'));
    assert.ok(source.includes('where: { code: planCode, isActive: true }'));
  });

  it("continues to reject the free plan regardless of identifier casing", () => {
    assert.ok(source.includes('plan.code.toUpperCase() === "FREE"'));
  });
});
