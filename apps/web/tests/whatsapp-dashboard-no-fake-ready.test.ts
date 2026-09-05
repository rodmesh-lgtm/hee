import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp hub derives connection readiness from connected and disabled state", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  assert.match(page, /connection\?\.status==="connected"&&!connection\.disabledAt/);
  assert.match(page, /لا نعرض أي قسم كجاهز قبل اكتمال متطلباته/);
});
