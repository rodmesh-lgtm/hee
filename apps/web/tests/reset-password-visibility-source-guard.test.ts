import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8");

describe("reset password visibility controls", () => {
  it("provides independent accessible visibility toggles for both password fields", () => {
    expect(source).toContain("useState(false)");
    expect(source).toContain('Eye, EyeOff, ShieldCheck');
    expect(source).toContain('type={visible ? "text" : "password"}');
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-pressed={visible}');
    expect(source).toContain('<PasswordInput name="password" label="كلمة المرور الجديدة" />');
    expect(source).toContain('<PasswordInput name="confirmPassword" label="تأكيد كلمة المرور" />');
  });
});
