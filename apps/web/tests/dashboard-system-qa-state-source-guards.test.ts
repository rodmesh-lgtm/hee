import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const layout=new URL("../app/dashboard/layout.tsx",import.meta.url);
const qa=new URL("../app/dashboard/system-qa.css",import.meta.url);
const states=new URL("../app/dashboard/state-system.css",import.meta.url);
test("system QA and state layers are final dashboard overrides",async()=>{const s=await readFile(layout,"utf8");const billing=s.indexOf('import "./billing-product.css"'),qaAt=s.indexOf('import "./system-qa.css"'),stateAt=s.indexOf('import "./state-system.css"');assert.ok(billing>=0&&qaAt>billing&&stateAt>qaAt)});
test("system QA protects narrow mobile RTL focus reduced motion and forced colors",async()=>{const s=await readFile(qa,"utf8");assert.match(s,/max-width:390px/);assert.match(s,/overflow-x:clip/);assert.match(s,/\[dir="rtl"\]/);assert.match(s,/:focus-visible/);assert.match(s,/prefers-reduced-motion:reduce/);assert.match(s,/forced-colors:active/)});
test("operational states distinguish busy empty loading error success and warning",async()=>{const s=await readFile(states,"utf8");for(const token of ['aria-busy="true"','data-state="empty"','data-state="loading"','data-state="error"','data-state="success"','data-state="warning"'])assert.ok(s.includes(token),token);assert.match(s,/prefers-reduced-motion:reduce/)});
