import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp hub derives connection readiness from connected and disabled state", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  assert.match(page, /connection\?\.status\s*===\s*"connected"\s*&&\s*!connection\.disabledAt/);
  assert.match(page, /الحالات هنا مشتقة من بياناتك الفعلية ولا نفترض الجاهزية/);
  assert.match(page, /ready:\s*launchReadiness\.ready/);
});
