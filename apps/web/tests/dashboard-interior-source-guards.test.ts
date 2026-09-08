import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const layout=new URL("../app/dashboard/layout.tsx",import.meta.url);
const interior=new URL("../app/dashboard/dashboard-interior.css",import.meta.url);
test("dashboard interior is the final dashboard product override",async()=>{const s=await readFile(layout,"utf8");const states=s.indexOf('import "./state-system.css"'),interiorAt=s.indexOf('import "./dashboard-interior.css"');assert.ok(states>=0&&interiorAt>states)});
test("execution center uses dense desktop rows and purpose-built mobile cards",async()=>{const s=await readFile(interior,"utf8");assert.match(s,/section\[aria-labelledby="work-center"\] article\{display:grid!important/);assert.match(s,/grid-template-columns:minmax\(170px,1\.15fr\)/);assert.match(s,/border-radius:0!important/);assert.match(s,/max-width:767px/);assert.match(s,/display:flex!important/);assert.match(s,/flex-direction:column!important/)});
test("desktop dashboard uses full-width execution and balanced supporting columns",async()=>{const s=await readFile(interior,"utf8");assert.match(s,/repeat\(12,minmax\(0,1fr\)\)/);assert.match(s,/section\[aria-labelledby="work-center"\]\{grid-column:1\/-1!important;grid-row:auto!important\}/);assert.match(s,/section:nth-child\(n\+3\)\{grid-column:span 6!important;grid-row:auto!important/);assert.doesNotMatch(s,/grid-row:2\/span/);assert.match(s,/data-dashboard-theme="dark"/);assert.match(s,/prefers-reduced-motion:reduce/)});
