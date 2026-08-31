import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();
const layout = fs.readFileSync(path.join(root, "app/dashboard/whatsapp/layout.tsx"), "utf8");
const sectionNav = fs.readFileSync(path.join(root, "app/dashboard/whatsapp/_components/whatsapp-section-nav.tsx"), "utf8");

test("WhatsApp dashboard gives every nested page persistent parent navigation", () => {
  assert.match(layout, /aria-label="مسار التنقل"/);
  assert.match(layout, /href="\/dashboard"/);
  assert.match(layout, /href="\/dashboard\/whatsapp"/);
  assert.match(layout, /العودة إلى مركز واتساب/);
});

test("WhatsApp dashboard exposes all operational sections in persistent local navigation", () => {
  for (const route of ["contacts", "templates", "campaigns", "automations", "integrations", "inbox", "setup", "audit"]) {
    assert.match(sectionNav, new RegExp(`/dashboard/whatsapp/${route}`));
  }
  assert.match(sectionNav, /aria-current=\{active \? "page"/);
  assert.match(sectionNav, /overflow-x-auto/);
});
