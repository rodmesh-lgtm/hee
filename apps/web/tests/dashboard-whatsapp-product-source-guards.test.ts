import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath=new URL("../app/dashboard/layout.tsx",import.meta.url);
const cssPath=new URL("../app/dashboard/whatsapp-product.css",import.meta.url);

test("WhatsApp product layer loads after the shared command-space layers",async()=>{
 const source=await readFile(layoutPath,"utf8");
 const command=source.indexOf('import "./command-space.css"');
 const whatsapp=source.indexOf('import "./whatsapp-product.css"');
 assert.ok(command>=0&&whatsapp>command);
});

test("WhatsApp workspace preserves product interaction, campaign, inbox and accessibility states",async()=>{
 const source=await readFile(cssPath,"utf8");
 assert.match(source,/data-dashboard-path\^="\/dashboard\/whatsapp"/);
 assert.match(source,/dashboard\/whatsapp\/campaigns/);
 assert.match(source,/dashboard\/whatsapp\/inbox/);
 assert.match(source,/:focus-visible/);
 assert.match(source,/min-height:44px/);
 assert.match(source,/data-dashboard-theme="dark"/);
 assert.match(source,/prefers-reduced-motion:reduce/);
});
