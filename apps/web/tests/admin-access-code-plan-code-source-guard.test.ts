import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../app/actions/admin-access-code.ts", import.meta.url), "utf8");

describe("admin access-code plan identifiers", () => {
  it("preserves the exact persisted plan code instead of uppercasing it", () => {
    expect(source).toContain('const planCode = String(formData.get("plan") ?? "").trim();');
    expect(source).not.toContain('String(formData.get("plan") ?? "").trim().toUpperCase()');
    expect(source).toContain('where: { code: planCode, isActive: true }');
  });

  it("continues to reject the free plan regardless of identifier casing", () => {
    expect(source).toContain('plan.code.toUpperCase() === "FREE"');
  });
});
