import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp hub does not present unfinished providers as active", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /تمهيدًا لمزامنة السلة/);
  assert.match(page, /Salla وZid مغلقين كمسودة/);
});
