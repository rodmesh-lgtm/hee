import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("WhatsApp domain foundation source guards", () => {
  it("keeps explicit consent separate from customer/order/booking existence", () => {
    const source = read("app/lib/whatsapp/domain.ts");
    expect(source).toContain("consent.revokedAt");
    expect(source).toContain("consent.businessId === input.businessId");
    expect(source).toContain("consent.phoneE164 === input.phoneE164");
    expect(source).not.toMatch(/orderId|bookingId/);
  });

  it("fails closed on cross-tenant records", () => {
    const source = read("app/lib/whatsapp/domain.ts");
    expect(source).toContain("WHATSAPP_TENANT_SCOPE_VIOLATION");
    expect(source).toContain("record.businessId !== activeBusinessId");
  });

  it("uses authenticated versioned encryption bound to business context", () => {
    const source = read("app/lib/whatsapp/credential-envelope.ts");
    expect(source).toContain('"aes-256-gcm"');
    expect(source).toContain("keyVersion");
    expect(source).toContain("setAAD");
    expect(source).toContain("input.businessId");
    expect(source).toContain("getAuthTag");
    expect(source).not.toContain("META_WHATSAPP_SYSTEM_USER_TOKEN");
  });
});
