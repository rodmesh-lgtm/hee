import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=readFileSync("app/actions/smart-reminders.ts","utf8");
const page=readFileSync("app/dashboard/reminders/page.tsx","utf8");

test("customer reminder execution action stays tenant scoped and fail closed",()=>{
  assert.match(source,/updateSmartReminderExecutionContextAction/);
  assert.match(source,/updateReminderExecutionContext\(\{businessId:context\.businessId,actorUserId:context\.userId,reminderId/);
  assert.match(source,/REMINDER_WORK_HEALTH\.includes/);
  assert.match(source,/REMINDER_PRIORITIES\.includes/);
  assert.match(source,/businessDueAt===undefined/);
  assert.match(source,/revalidatePath\("\/dashboard\/notes"\)/);
  assert.match(source,/execution=success&tab=work/);
});

test("execution validation errors are not exposed as technical codes to customer",()=>{
  assert.match(source,/code\.startsWith\("REMINDER_EXECUTION_"\)/);
  assert.match(source,/execution-invalid/);
});

test("business execution center exposes real execution context independently from delivery",()=>{
  for(const field of ["workHealth","priority","responsiblePerson","businessDueAt","nextAction"]){
    assert.ok(page.includes(`r.\"${field}\"`),`missing execution field ${field}`);
  }
  assert.match(page,/updateSmartReminderExecutionContextAction/);
  assert.match(page,/const deliveryNeedsAttention=/);
  assert.match(page,/const businessNeedsAttention=/);
  assert.match(page,/businessDueOverdue/);
  assert.match(page,/سياق تنفيذ العمل/);
  assert.match(page,/مسؤول التنفيذ/);
  assert.match(page,/موعد العمل/);
  assert.match(page,/الخطوة التالية/);
  assert.match(page,/قناة التنبيه تحتاج مراجعة/);
  assert.match(page,/تنفيذ العمل يحتاج انتباهًا/);
});

test("business attention is calculated from stored work state rather than fake dashboard numbers",()=>{
  assert.match(page,/executionStats=\{blocked:reminders\.filter/);
  assert.match(page,/r\.workHealth===\"blocked\"/);
  assert.match(page,/r\.workHealth===\"at_risk\"/);
  assert.match(page,/reminders\.filter\(businessDueOverdue\)/);
  assert.match(page,/reminders\.filter\(deliveryNeedsAttention\)/);
  assert.doesNotMatch(page,/const executionStats=\{blocked:\d/);
});
