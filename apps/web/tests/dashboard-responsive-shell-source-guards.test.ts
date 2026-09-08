import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source=fs.readFileSync(path.join(process.cwd(),"components/dashboard/dashboard-shell.tsx"),"utf8");

test("business productivity routes have explicit shell titles",()=>{
  assert.match(source,/"\/dashboard\/notes":"مذكرات الأعمال"/);
  assert.match(source,/"\/dashboard\/reminders":"التذكيرات الذكية"/);
  assert.match(source,/"\/dashboard\/notifications":"مركز الإشعارات"/);
});

test("mobile shell keeps safe-area navigation and touch-sized controls",()=>{
  assert.match(source,/safe-area-inset-bottom/);
  assert.match(source,/min-h-\[54px\]/);
  assert.match(source,/h-11 w-11/);
  assert.match(source,/mobile\?"min-h-11 px-3 py-3/);
});

test("motion-sensitive users can suppress navigation animation",()=>{
  assert.match(source,/motion-reduce:transition-none/);
});

test("drawer remains keyboard accessible and modal",()=>{
  assert.match(source,/e\.key==="Escape"/);
  assert.match(source,/e\.key!=="Tab"/);
  assert.match(source,/role="dialog"/);
  assert.match(source,/aria-modal=/);
  assert.match(source,/inert=!open/);
});
