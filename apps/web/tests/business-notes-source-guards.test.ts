import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const actions = source("app/actions/business-notes.ts");
const page = source("app/dashboard/notes/page.tsx");
const migration = source("prisma/migrations/20260906043000_add_business_notes/migration.sql");
const productivityMigration = source("prisma/migrations/20260906084500_enrich_business_notes_and_reminder_link/migration.sql");
const reminderActions = source("app/actions/smart-reminders.ts");
const reminderForm = source("components/dashboard/smart-reminder-create-form.tsx");
const readiness = source("app/lib/business-notes/schema-readiness.ts");
const nav = source("components/dashboard/dashboard-nav.ts");

test("business notes mutations are tenant scoped and input bounded", () => {
  assert.match(actions, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(actions, /"businessId"=\$\{businessId\}/);
  assert.match(actions, /text\(form, "title", 160\)/);
  assert.match(actions, /text\(form, "body", 8000\)/);
  assert.match(actions, /cardinality|tags/);
});

test("business notes storage has tenant relation and database length guards", () => {
  assert.match(migration, /FOREIGN KEY \("businessId"\) REFERENCES "Business"\("id"\)/);
  assert.match(migration, /BusinessNote_id_business_unique/);
  assert.match(migration, /char_length\("title"\) BETWEEN 1 AND 160/);
  assert.match(migration, /char_length\("body"\) BETWEEN 1 AND 8000/);
});

test("productivity migration adds structured note lifecycle and tenant-safe reminder relation", () => {
  assert.match(productivityMigration, /"category" TEXT NOT NULL/);
  assert.match(productivityMigration, /"priority" TEXT NOT NULL/);
  assert.match(productivityMigration, /"tags" TEXT\[\] NOT NULL/);
  assert.match(productivityMigration, /"status" TEXT NOT NULL/);
  assert.match(productivityMigration, /"businessNoteId" TEXT/);
  assert.match(productivityMigration, /FOREIGN KEY \("businessNoteId", "businessId"\)/);
  assert.match(productivityMigration, /REFERENCES "BusinessNote"\("id", "businessId"\)/);
});

test("business memory UI supports search filters archive restore and reminder creation", () => {
  assert.match(page, /createBusinessNoteAction/);
  assert.match(page, /updateBusinessNoteAction/);
  assert.match(page, /toggleBusinessNotePinAction/);
  assert.match(page, /moveBusinessNoteAction/);
  assert.match(page, /archiveBusinessNoteAction/);
  assert.match(page, /restoreBusinessNoteAction/);
  assert.match(page, /name="q"/);
  assert.match(page, /name="priority"/);
  assert.match(page, /dashboard\/reminders\?note=/);
  assert.match(nav, /مذكرات الأعمال/);
});

test("note-linked reminders validate active tenant ownership on the server", () => {
  assert.match(reminderActions, /"BusinessNote"/);
  assert.match(reminderActions, /"businessId"=\$\{context\.businessId\}/);
  assert.match(reminderActions, /"status" <> 'archived'/);
  assert.match(reminderActions, /"businessNoteId"=\$\{businessNoteId\}/);
  assert.match(reminderForm, /useSearchParams/);
  assert.match(reminderForm, /name="businessNoteId"/);
});

test("schema readiness fails closed until productivity columns and reminder relation exist", () => {
  assert.match(readiness, /column_name='category'/);
  assert.match(readiness, /column_name='priority'/);
  assert.match(readiness, /column_name='tags'/);
  assert.match(readiness, /column_name='status'/);
  assert.match(readiness, /column_name='businessNoteId'/);
});
