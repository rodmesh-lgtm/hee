import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp hub keeps a distinct icon for every operational section", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  for (const icon of ["ContactRound", "FileText", "Megaphone", "Workflow", "ShoppingBag", "MessageCircle", "Link2", "ShieldCheck"]) {
    assert.match(page, new RegExp(`icon:\\s*${icon}`));
  }
});
