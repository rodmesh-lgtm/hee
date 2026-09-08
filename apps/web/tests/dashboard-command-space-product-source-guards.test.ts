import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath=new URL("../app/dashboard/layout.tsx",import.meta.url);
const cssPath=new URL("../app/dashboard/command-space.css",import.meta.url);
const pagePath=new URL("../app/dashboard/page.tsx",import.meta.url);

test("command-space product layer is the final dashboard presentation layer",async()=>{
 const source=await readFile(layoutPath,"utf8");
 const shell=source.indexOf('import "./product-shell.css"');
 const command=source.indexOf('import "./command-space.css"');
 assert.ok(shell>=0&&command>shell);
});

test("business execution remains the operational center of gravity",async()=>{
 const source=await readFile(cssPath,"utf8");
 assert.match(source,/section\[aria-labelledby="work-center"\]/);
 assert.match(source,/grid-template-columns:minmax\(0,1\.62fr\) minmax\(310px,\.68fr\)/);
 assert.match(source,/grid-row:2\/span 4/);
 assert.match(source,/max-width:767px/);
 assert.match(source,/data-dashboard-theme="dark"/);
 assert.match(source,/prefers-reduced-motion:reduce/);
});

test("command space continues to rank real tenant work rather than fabricated dashboard data",async()=>{
 const source=await readFile(pagePath,"utf8");
 assert.match(source,/prioritizeWork\(workCandidates,now\)\.slice\(0,3\)/);
 assert.match(source,/workBucket\(item,now\)/);
 assert.match(source,/WHERE "businessId"=\$\{business\.id\}/);
 assert.match(source,/BUSINESS EXECUTION CENTER/);
});
