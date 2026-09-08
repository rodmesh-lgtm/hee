import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath=new URL("../app/dashboard/layout.tsx",import.meta.url);
const productCssPath=new URL("../app/dashboard/product-interface.css",import.meta.url);

test("customer workspace loads the product interface layer after the shared theme",async()=>{
  const source=await readFile(layoutPath,"utf8");
  const theme=source.indexOf('import "./dashboard-theme.css"');
  const product=source.indexOf('import "./product-interface.css"');
  assert.ok(theme>=0&&product>theme,"product interface must layer on top of the established light/dark theme contract");
});

test("product interface exposes real interaction and density states",async()=>{
  const source=await readFile(productCssPath,"utf8");
  assert.match(source,/--infro-pi-control:44px/);
  assert.match(source,/\[aria-current="page"\]/);
  assert.match(source,/:focus-visible/);
  assert.match(source,/:active:not\(:disabled\)/);
  assert.match(source,/@media \(max-width:639px\)/);
  assert.match(source,/data-dashboard-theme="dark"/);
  assert.match(source,/prefers-reduced-motion:reduce/);
});

test("command space uses an asymmetric operational desktop and compact mobile hierarchy",async()=>{
  const source=await readFile(productCssPath,"utf8");
  assert.match(source,/data-dashboard-path="\/dashboard"/);
  assert.match(source,/grid-template-columns:minmax\(0,1\.58fr\) minmax\(330px,\.72fr\)/);
  assert.match(source,/section:nth-child\(2\).*grid-column:1/);
  assert.match(source,/section:nth-child\(n\+3\).*grid-column:2/);
  assert.match(source,/flex-basis:100%/);
  assert.match(source,/--infro-pi-border:#24484c/);
});
