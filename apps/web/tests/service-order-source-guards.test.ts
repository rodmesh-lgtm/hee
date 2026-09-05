import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
const source=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

test("services studio exposes touch and keyboard ordering",()=>{
  const page=source("app/dashboard/services/page.tsx");
  const editor=source("components/dashboard/service-order-editor.tsx");
  assert.match(page,/ServiceOrderEditor/);
  assert.match(editor,/onPointerDown/);assert.match(editor,/onPointerMove/);assert.match(editor,/setPointerCapture/);assert.match(editor,/touch-none/);assert.match(editor,/moveBy/);
  assert.match(editor,/\/api\/dashboard\/services\/order/);
});

test("service ordering endpoint is tenant scoped locked and bounded",()=>{
  const route=source("app/api/dashboard/services/order/route.ts");
  assert.match(route,/getOwnedBusinessForApiWrite/);assert.match(route,/readBoundedJson\(request,16\*1024\)/);assert.match(route,/consumePublicWriteLimit/);assert.match(route,/pg_advisory_xact_lock/);assert.match(route,/businessId:business\.id/);assert.match(route,/deletedAt:null/);assert.match(route,/sortOrder/);
});
