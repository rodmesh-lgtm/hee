import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("shared controls keep accessible invalid, disabled and reduced-motion states", () => {
  for (const path of ["components/ui/input.tsx", "components/ui/textarea.tsx"]) {
    const source = read(path);
    assert.match(source, /aria-invalid:border-rose-600/);
    assert.match(source, /disabled:cursor-not-allowed/);
    assert.match(source, /motion-reduce:transition-none/);
    assert.match(source, /placeholder:text-slate-500/);
  }
  const button = read("components/ui/button.tsx");
  assert.doesNotMatch(button, /whileHover|whileTap|from-indigo|via-violet/);
  assert.match(button, /disabled:cursor-not-allowed/);
});

test("audience table and filters have names and keyboard-scroll access", () => {
  const source = read("app/dashboard/whatsapp/contacts/page.tsx");
  assert.match(source, /البحث في جهات الاتصال/);
  assert.match(source, /aria-label="تصفية أهلية الجمهور"/);
  assert.match(source, /role="region" aria-label="جدول جهات الاتصال — مرر لعرض الأعمدة" tabIndex=\{0\}/);
  assert.match(source, /<caption/);
});

test("light navigation search has its own readable placeholder and dark table tokens", () => {
  const css = read("app/dashboard/customer-workspace.css");
  assert.match(css, /light.*infro-nav-search input::placeholder.*#526b66/);
  assert.match(css, /dark.*--infro-table-head:#173a3b/);
  assert.match(css, /infro-table-scroll thead th.*position:sticky/);
});
