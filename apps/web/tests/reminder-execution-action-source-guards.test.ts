import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=readFileSync("app/actions/smart-reminders.ts","utf8");

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
