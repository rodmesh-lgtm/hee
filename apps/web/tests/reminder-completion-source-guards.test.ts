import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const operationsPath=new URL("../app/lib/reminders/operations.ts",import.meta.url);

test("completed reminders close lifecycle and work-progress state atomically",async()=>{
  const source=await readFile(operationsPath,"utf8");
  const start=source.indexOf("export async function completeSmartReminder");
  assert.ok(start>=0,"completeSmartReminder must exist");
  const block=source.slice(start);
  assert.match(block,/WHERE "id"=\$\{input\.reminderId\} AND "businessId"=\$\{input\.businessId\}/);
  assert.match(block,/"status"='completed'/);
  assert.match(block,/"progressPercent"=100/);
  assert.match(block,/"progressUpdatedAt"=CURRENT_TIMESTAMP/);
  assert.match(block,/"workCompletedAt"=COALESCE\("workCompletedAt",CURRENT_TIMESTAMP\)/);
  assert.match(block,/assertNoInFlightDelivery/);
  assert.match(block,/cancelQueuedDeliveries/);
  assert.match(block,/action: "reminder\.complete"/);
});
