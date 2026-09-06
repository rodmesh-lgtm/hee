import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=(path:string)=>readFileSync(path,"utf8");
const progressMigration=source("prisma/migrations/20260906124500_business_productivity_progress/migration.sql");
const decouplingMigration=source("prisma/migrations/20260906125000_decouple_reminder_work_progress/migration.sql");
const progress=source("app/lib/reminders/progress.ts");
const actions=source("app/actions/smart-reminders.ts");
const page=source("app/dashboard/reminders/page.tsx");
const readiness=source("app/lib/reminders/schema-readiness.ts");

test("work progress is bounded and explicitly independent from reminder delivery lifecycle",()=>{
  assert.match(progressMigration,/"progressPercent" INTEGER NOT NULL DEFAULT 0/);
  assert.match(progressMigration,/"progressPercent" BETWEEN 0 AND 100/);
  assert.match(decouplingMigration,/"workCompletedAt" TIMESTAMP\(3\)/);
  assert.match(decouplingMigration,/"progressPercent" = 100 AND "workCompletedAt" IS NOT NULL/);
  assert.match(decouplingMigration,/"progressPercent" < 100 AND "workCompletedAt" IS NULL/);
  assert.doesNotMatch(decouplingMigration,/status.*completed.*progressPercent/s);
});

test("business progress updates are tenant scoped serialized and audited",()=>{
  assert.match(progress,/WHERE "id"=\$\{input\.reminderId\} AND "businessId"=\$\{input\.businessId\}/);
  assert.match(progress,/FOR UPDATE/);
  assert.match(progress,/TransactionIsolationLevel\.Serializable/);
  assert.match(progress,/reminder\.progress\.update/);
  assert.match(progress,/progressPercent === 100 \? new Date\(\) : null/);
  assert.doesNotMatch(progress,/SET "status"='completed'/);
});

test("customer reminder workspace supports partial half and full business completion",()=>{
  assert.match(actions,/updateSmartReminderProgressAction/);
  assert.match(page,/updateSmartReminderProgressAction/);
  assert.match(page,/25,"منجز جزئيًا"/);
  assert.match(page,/50,"منجز نصفه"/);
  assert.match(page,/100,"منجز بالكامل"/);
  assert.match(page,/name="progressPercent"/);
  assert.match(page,/name="progressNote"/);
  assert.match(page,/إنهاء التذكير/);
  assert.match(page,/هذا المؤشر يعبّر عن تنفيذ المهمة، وليس عن وصول رسالة التذكير/);
});

test("delivery feedback is latest per channel rather than one global delivery row",()=>{
  assert.match(page,/SELECT DISTINCT ON \("channel"\)/);
  assert.match(page,/jsonb_agg\(jsonb_build_object/);
  assert.match(page,/"deliveredAt"/);
  assert.match(page,/"readAt"/);
  assert.match(page,/تمت القراءة/);
  assert.match(page,/تم التسليم/);
  assert.match(page,/تم إنشاء الإشعار/);
});

test("schema readiness fails closed until progress and receipt columns exist",()=>{
  for(const column of ["deliveredAt","readAt","progressPercent","progressNote","progressUpdatedAt","workCompletedAt"]) assert.match(readiness,new RegExp(`column_name='${column}'`));
});
