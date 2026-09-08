import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const actions = source("app/actions/business-notes.ts");
const page = source("app/dashboard/notes/page.tsx");
const migration = source("prisma/migrations/20260906043000_add_business_notes/migration.sql");
const productivityMigration = source("prisma/migrations/20260906084500_enrich_business_notes_and_reminder_link/migration.sql");
const businessProductivityMigration = source("prisma/migrations/20260906124500_business_productivity_progress/migration.sql");
const reminderActions = source("app/actions/smart-reminders.ts");
const reminderOperations = source("app/lib/reminders/operations.ts");
const reminderForm = source("components/dashboard/smart-reminder-create-form.tsx");
const readiness = source("app/lib/business-notes/schema-readiness.ts");
const nav = source("components/dashboard/dashboard-nav.ts");

test("business notes mutations are tenant scoped input bounded and audited transactionally", () => {
  assert.match(actions, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(actions, /"businessId"=\$\{businessId\}/);
  assert.match(actions, /text\(form,\s*"title",\s*160\)/);
  assert.match(actions, /text\(form,\s*"body",\s*8000\)/);
  assert.match(actions, /db\.\$transaction/);
  assert.match(actions, /writeWhatsAppAuditLog/);
  assert.match(actions, /targetType:\s*"business_note"/);
  assert.doesNotMatch(actions, /metadata:\s*\{[^}]*body/);
});

test("business notes storage has tenant relation and database length guards", () => {
  assert.match(migration, /FOREIGN KEY \("businessId"\) REFERENCES "Business"\("id"\)/);
  assert.match(migration, /BusinessNote_id_business_unique/);
  assert.match(migration, /char_length\("title"\) BETWEEN 1 AND 160/);
  assert.match(migration, /char_length\("body"\) BETWEEN 1 AND 8000/);
});

test("productivity migrations add structured business memory and tenant-safe reminder relation", () => {
  assert.match(productivityMigration, /"category" TEXT NOT NULL/);
  assert.match(productivityMigration, /"priority" TEXT NOT NULL/);
  assert.match(productivityMigration, /"tags" TEXT\[\] NOT NULL/);
  assert.match(productivityMigration, /"businessNoteId" TEXT/);
  assert.match(productivityMigration, /FOREIGN KEY \("businessNoteId", "businessId"\)/);
  assert.match(businessProductivityMigration, /"noteType" TEXT NOT NULL DEFAULT 'general'/);
  assert.match(businessProductivityMigration, /"summary" TEXT/);
  assert.match(businessProductivityMigration, /"outcome" TEXT/);
  assert.match(businessProductivityMigration, /"nextAction" TEXT/);
  assert.match(businessProductivityMigration, /"stakeholder" TEXT/);
  assert.match(businessProductivityMigration, /"referenceCode" TEXT/);
});

test("business memory UI is organization-oriented and exposes structured outcomes and next actions", () => {
  assert.match(page, /createBusinessNoteAction/);
  assert.match(page, /updateBusinessNoteAction/);
  assert.match(page, /toggleBusinessNotePinAction/);
  assert.match(page, /archiveBusinessNoteAction/);
  assert.match(page, /restoreBusinessNoteAction/);
  assert.match(page, /name="q"/);
  assert.match(page, /name="priority"/);
  assert.match(page, /name="noteType"/);
  assert.match(page, /name="summary"/);
  assert.match(page, /name="outcome"/);
  assert.match(page, /name="nextAction"/);
  assert.match(page, /name="stakeholder"/);
  assert.match(page, /name="referenceCode"/);
  assert.match(page, /حوّل الخطوة إلى تذكير/);
  assert.match(nav, /مذكرات الأعمال/);
});

test("structured business fields are persisted with bounded enums and lengths", () => {
  assert.match(actions, /NOTE_TYPES/);
  assert.match(actions, /optionalText\(form,"summary",1200\)/);
  assert.match(actions, /optionalText\(form,"outcome",2000\)/);
  assert.match(actions, /optionalText\(form,"nextAction",1200\)/);
  assert.match(actions, /optionalText\(form,"stakeholder",160\)/);
  assert.match(actions, /optionalText\(form,"referenceCode",120\)/);
  assert.match(actions, /"noteType"=\$\{structured\.noteType\}/);
});

test("note-linked reminders are validated and inserted atomically inside the reminder transaction", () => {
  assert.match(reminderActions, /businessNoteId/);
  assert.match(reminderActions, /createSmartReminder\(\{[\s\S]*?businessNoteId/);
  assert.doesNotMatch(reminderActions, /UPDATE "SmartReminder" SET "businessNoteId"/);
  assert.match(reminderOperations, /input\.businessNoteId/);
  assert.match(reminderOperations, /FROM "BusinessNote"/);
  assert.match(reminderOperations, /"businessId"=\$\{input\.businessId\}/);
  assert.match(reminderOperations, /"status" <> 'archived'/);
  assert.match(reminderOperations, /REMINDER_NOTE_INVALID/);
  assert.match(reminderOperations, /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/);
  assert.match(reminderForm, /useSearchParams/);
  assert.match(reminderForm, /searchParams\.get\("noteId"\)/);
  assert.match(reminderForm, /searchParams\.get\("title"\)/);
  assert.match(reminderForm, /searchParams\.get\("body"\)/);
  assert.match(reminderForm, /name="businessNoteId"/);
});

test("schema readiness fails closed until structured business memory columns exist", () => {
  for (const column of ["category","priority","tags","status","noteType","summary","outcome","nextAction","stakeholder","referenceCode","businessNoteId"]) assert.match(readiness, new RegExp(`column_name='${column}'`));
});
