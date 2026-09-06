import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=(path:string)=>readFileSync(path,"utf8");
const migration=source("prisma/migrations/20260906133500_business_execution_context/migration.sql");
const reminders=source("app/lib/reminders/execution-context.ts");
const notes=source("app/actions/business-notes.ts");
const reminderReadiness=source("app/lib/reminders/schema-readiness.ts");
const noteReadiness=source("app/lib/business-notes/schema-readiness.ts");
const qaContract=source("app/lib/qa-database-contract.ts");

test("business execution context is database bounded for reminders and notes",()=>{
  assert.match(migration,/SmartReminder_work_health_allowed/);
  assert.match(migration,/BusinessNote_work_health_allowed/);
  assert.match(migration,/\('on_track','at_risk','blocked'\)/);
  assert.match(migration,/\('low','normal','high','urgent'\)/);
  assert.match(migration,/responsible_person_length/);
  assert.match(migration,/next_action_length/);
  assert.match(migration,/SmartReminder_business_health_due_idx/);
  assert.match(migration,/BusinessNote_business_health_due_idx/);
});

test("reminder execution updates are tenant scoped serialized audited and independent from delivery lifecycle",()=>{
  assert.match(reminders,/WHERE "id"=\$\{input\.reminderId\} AND "businessId"=\$\{input\.businessId\}/);
  assert.match(reminders,/FOR UPDATE/);
  assert.match(reminders,/TransactionIsolationLevel\.Serializable/);
  assert.match(reminders,/reminder\.execution_context\.update/);
  assert.match(reminders,/reminder\.status === "cancelled"/);
  assert.doesNotMatch(reminders,/SET "status"=/);
  assert.doesNotMatch(reminders,/progressPercent/);
});

test("business notes persist health ownership and business deadline in tenant-scoped writes",()=>{
  assert.match(notes,/WORK_HEALTH = \["on_track","at_risk","blocked"\]/);
  assert.match(notes,/responsiblePerson/);
  assert.match(notes,/businessDueAt/);
  assert.match(notes,/"businessId"=\$\{businessId\}/);
  assert.match(notes,/FOR UPDATE/);
  assert.match(notes,/TransactionIsolationLevel\.Serializable/);
});

test("readiness and Preview contract fail closed until execution context exists",()=>{
  for(const column of ["workHealth","priority","responsiblePerson","businessDueAt","nextAction"]) assert.match(reminderReadiness,new RegExp(`column_name='${column}'`));
  for(const column of ["workHealth","responsiblePerson","businessDueAt"]) assert.match(noteReadiness,new RegExp(`column_name='${column}'`));
  assert.match(qaContract,/20260906133500_business_execution_context/);
});
