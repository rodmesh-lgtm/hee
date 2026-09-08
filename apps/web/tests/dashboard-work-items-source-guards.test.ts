import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath=new URL("../app/dashboard/layout.tsx",import.meta.url);
const workItemsPath=new URL("../app/dashboard/work-items.css",import.meta.url);

test("work-item interaction layer loads after the core product interface",async()=>{
  const source=await readFile(layoutPath,"utf8");
  const product=source.indexOf('import "./product-interface.css"');
  const workItems=source.indexOf('import "./work-items.css"');
  assert.ok(product>=0&&workItems>product,"operational work items must layer after the stable product interface");
});

test("notes and reminders render as operational queues with visible provenance",async()=>{
  const source=await readFile(workItemsPath,"utf8");
  assert.match(source,/data-dashboard-path="\/dashboard\/notes"/);
  assert.match(source,/data-dashboard-path="\/dashboard\/reminders"/);
  assert.match(source,/article:has\(a\[href\*="\/dashboard\/reminders"\]\)/);
  assert.match(source,/article:has\(a\[href\*="\/dashboard\/notes"\]\)/);
  assert.match(source,/linear-gradient\(180deg,#13c8b6,#0e8f89\)/);
});

test("work queues preserve command tooling, mobile targets, dark mode and reduced motion",async()=>{
  const source=await readFile(workItemsPath,"utf8");
  assert.match(source,/form:has\(input\[name="q"\]\)/);
  assert.match(source,/position:sticky/);
  assert.match(source,/min-height:44px/);
  assert.match(source,/data-dashboard-theme="dark"/);
  assert.match(source,/prefers-reduced-motion:reduce/);
});
