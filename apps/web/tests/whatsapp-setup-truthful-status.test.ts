import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("setup page does not present disabled or non-connected Meta connection as active", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/setup/page.tsx", import.meta.url), "utf8");
  assert.match(page, /disabledAt: true/);
  assert.match(page, /connection\?\.status === "connected" && !connection\.disabledAt/);
  assert.match(page, /الاتصال معطّل/);
  assert.match(page, /لن تُعامل الحملات أو الأتمتة هذا الرقم على أنه جاهز/);
});
