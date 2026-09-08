import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const proxy=new URL("../proxy.ts",import.meta.url);

test("production maintenance response uses INFRO public identity",async()=>{
  const source=await readFile(proxy,"utf8");
  const start=source.indexOf("function maintenanceResponse");
  const end=source.indexOf("function productionQaNotFoundResponse");
  assert.ok(start>=0&&end>start);
  const maintenance=source.slice(start,end);
  assert.match(maintenance,/INFRO/);
  assert.match(maintenance,/ir\.sa/);
  assert.doesNotMatch(maintenance,/>HEE</);
  assert.doesNotMatch(maintenance,/<title>HEE/);
  assert.match(maintenance,/Retry-After/);
  assert.match(maintenance,/noindex/);
});
