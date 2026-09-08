import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const retention=readFileSync("app/lib/business-memory/retention.ts","utf8");

test("age based retention never deletes a partially completed business task",()=>{
  assert.match(retention,/r\."status"='completed' AND r\."progressPercent"=100 AND r\."workCompletedAt" IS NOT NULL/);
  assert.match(retention,/r\."status"='cancelled'/);
  assert.doesNotMatch(retention,/WHERE r\."status" IN \('completed','cancelled'\)/);
});

test("archived notes remain preserved while linked business work still exists",()=>{
  assert.match(retention,/NOT EXISTS \(SELECT 1 FROM "SmartReminder" r WHERE r\."businessNoteId"=n\."id" AND r\."businessId"=n\."businessId"\)/);
  assert.match(retention,/Active and draft notes are never deleted by age/);
});
