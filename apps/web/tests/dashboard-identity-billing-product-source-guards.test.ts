import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const layout=new URL("../app/dashboard/layout.tsx",import.meta.url);
const identity=new URL("../app/dashboard/identity-product.css",import.meta.url);
const billing=new URL("../app/dashboard/billing-product.css",import.meta.url);
test("identity and billing layers load after WhatsApp",async()=>{const s=await readFile(layout,"utf8");const w=s.indexOf('import "./whatsapp-product.css"'),i=s.indexOf('import "./identity-product.css"'),b=s.indexOf('import "./billing-product.css"');assert.ok(w>=0&&i>w&&b>i)});
test("digital identity preserves product accessibility mobile dark and reduced motion",async()=>{const s=await readFile(identity,"utf8");assert.match(s,/dashboard\/digital-identity/);assert.match(s,/:focus-visible/);assert.match(s,/max-width:639px/);assert.match(s,/data-dashboard-theme="dark"/);assert.match(s,/prefers-reduced-motion:reduce/)});
test("billing preserves transactional table progress mobile dark and focus states",async()=>{const s=await readFile(billing,"utf8");assert.match(s,/dashboard\/billing/);assert.match(s,/table/);assert.match(s,/role="progressbar"/);assert.match(s,/:focus-visible/);assert.match(s,/max-width:639px/);assert.match(s,/data-dashboard-theme="dark"/)});
