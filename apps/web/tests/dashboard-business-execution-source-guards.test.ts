import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source=fs.readFileSync(path.join(process.cwd(),"app/dashboard/page.tsx"),"utf8");

test("dashboard wires deterministic work priority into real tenant data",()=>{
  assert.match(source,/prioritizeWork,workBucket,type WorkPriorityReason,type WorkBucket/);
  assert.match(source,/WHERE "businessId"=\$\{business\.id\} AND "status" IN \('scheduled','paused'\)/);
  assert.match(source,/WHERE "businessId"=\$\{business\.id\} AND "status"<>'archived'/);
  assert.match(source,/prioritizeWork\(workCandidates,now\)\.slice\(0,3\)/);
});

test("focus now uses ranked operational work before generic transaction work",()=>{
  assert.match(source,/primaryWork=priorityWork\.find\(item=>item\.rank>=400\)\?\?null/);
  assert.match(source,/:primaryWork\?\{title:primaryWork\.title/);
  assert.match(source,/href:workHref\(primaryWork\.kind\)/);
});

test("execution center exposes real action context without fabricating note progress",()=>{
  assert.match(source,/reasonText\(item\.reason\)/);
  assert.match(source,/item\.responsiblePerson\|\|"غير محدد"/);
  assert.match(source,/item\.nextAction/);
  assert.match(source,/item\.progressPercent===null\?"غير محدد"/);
  assert.match(source,/min-h-11/);
});

test("execution center groups the same top three work items into daily stages",()=>{
  assert.match(source,/today:\{label:"اليوم",description:"يحتاج تدخلك الآن"\}/);
  assert.match(source,/next:\{label:"التالي",description:"أقرب خطوة بعد ذلك"\}/);
  assert.match(source,/waiting:\{label:"بانتظار متابعة",description:"متوقف مؤقتًا حتى استئنافه"\}/);
  assert.match(source,/priorityWork\.filter\(item=>workBucket\(item,now\)===key\)/);
  assert.match(source,/group\.items\.map\(item=><PriorityWorkCard/);
});
