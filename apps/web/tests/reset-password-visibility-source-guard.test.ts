import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8");

describe("reset password visibility controls", () => {
  it("provides independent accessible visibility toggles for both password fields", () => {
    assert.ok(source.includes("useState(false)"));
    assert.ok(source.includes("Eye, EyeOff, ShieldCheck"));
    assert.ok(source.includes('type={visible ? "text" : "password"}'));
    assert.ok(source.includes('type="button"'));
    assert.ok(source.includes("aria-pressed={visible}"));
    assert.ok(source.includes('<PasswordInput name="password" label="كلمة المرور الجديدة" />'));
    assert.ok(source.includes('<PasswordInput name="confirmPassword" label="تأكيد كلمة المرور" />'));
  });
});
