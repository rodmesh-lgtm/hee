import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actionsFile=new URL("../app/actions/business-notes.ts",import.meta.url);

test("Business Memory derives every write tenant from the authenticated active business",async()=>{
  const s=await readFile(actionsFile,"utf8");
  assert.ok(s.includes("getCurrentUser()"));
  assert.ok(s.includes("getActiveBusinessForUser(user.id)"));
  assert.ok(s.includes("businessId:business.id"));
  assert.ok(!s.includes('form.get("businessId")'));
});

test("Business Memory update archive restore delete pin and reorder remain tenant scoped",async()=>{
  const s=await readFile(actionsFile,"utf8");
  const scoped='AND "businessId"=${businessId}';
  assert.ok(s.includes(scoped));
  for(const action of ["business_note.update","business_note.archive","business_note.restore","business_note.delete","business_note.pin_toggle","business_note.reorder"]){
    assert.ok(s.includes(`action:"${action}"`),action);
  }
  assert.match(s,/Prisma\.TransactionIsolationLevel\.Serializable/g);
});

test("Business Memory refuses deletion while a same-tenant Smart Reminder is linked",async()=>{
  const s=await readFile(actionsFile,"utf8");
  assert.ok(s.includes('FROM "SmartReminder" WHERE "businessId"=${businessId} AND "businessNoteId"=${noteId}'));
  assert.ok(s.includes('return"linked" as const'));
  assert.ok(s.includes('delete=linked-reminder'));
});

test("Business Memory to Reminder handoff passes note identity but never tenant identity from the client",async()=>{
  const s=await readFile(actionsFile,"utf8");
  const start=s.indexOf('function continueToReminder(input:{noteId:string;title:string;body:string})');
  const end=s.indexOf('\nasync function audit(',start);
  assert.ok(start>=0&&end>start,"continueToReminder helper must keep a narrow client handoff contract");
  const handoff=s.slice(start,end);
  assert.ok(handoff.includes('noteId:input.noteId'));
  assert.ok(handoff.includes('source:"business-memory"'));
  assert.ok(!handoff.includes("businessId"));
  assert.ok(s.includes('if(afterSave==="reminder")continueToReminder({noteId,title,body:structured.nextAction??body})'));
});
