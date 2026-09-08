import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath=new URL("../app/dashboard/layout.tsx",import.meta.url);
const shellCssPath=new URL("../app/dashboard/product-shell.css",import.meta.url);
const navPath=new URL("../components/dashboard/dashboard-nav.ts",import.meta.url);

test("product shell loads after work-item and interface layers",async()=>{
  const source=await readFile(layoutPath,"utf8");
  const product=source.indexOf('import "./product-interface.css"');
  const work=source.indexOf('import "./work-items.css"');
  const shell=source.indexOf('import "./product-shell.css"');
  assert.ok(product>=0&&work>product&&shell>work);
});

test("shell chrome has real active locked mobile dark and motion states",async()=>{
  const source=await readFile(shellCssPath,"utf8");
  assert.match(source,/--infro-shell-rail:248px/);
  assert.match(source,/a\[aria-current="page"\]/);
  assert.match(source,/feature=whatsapp-marketing/);
  assert.match(source,/aria-label="التنقل السريع"/);
  assert.match(source,/data-dashboard-theme="dark"/);
  assert.match(source,/max-width:639px/);
  assert.match(source,/prefers-reduced-motion:reduce/);
});

test("customer rail stays intentionally compact and routes advanced editing through parent studios",async()=>{
  const source=await readFile(navPath,"utf8");
  assert.match(source,/Customer navigation stays intentionally compact/);
  assert.match(source,/activePrefixes: \["\/dashboard\/services"/);
  assert.match(source,/activePrefixes: \["\/dashboard\/whatsapp"\]/);
  assert.doesNotMatch(source,/label: "الخدمات", href: "\/dashboard\/services"/);
});
