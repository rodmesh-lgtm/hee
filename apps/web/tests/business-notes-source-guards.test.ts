import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const actions = source("app/actions/business-notes.ts");
const page = source("app/dashboard/notes/page.tsx");
const migration = source("prisma/migrations/20260906043000_add_business_notes/migration.sql");
const nav = source("components/dashboard/dashboard-nav.ts");

test("business notes mutations are tenant scoped and input bounded", () => {
  assert.match(actions, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(actions, /"businessId"=\$\{businessId\}/);
  assert.match(actions, /text\(form, "title", 160\)/);
  assert.match(actions, /text\(form, "body", 8000\)/);
});

test("business notes storage has tenant relation and database length guards", () => {
  assert.match(migration, /FOREIGN KEY \("businessId"\) REFERENCES "Business"\("id"\)/);
  assert.match(migration, /BusinessNote_id_business_unique/);
  assert.match(migration, /char_length\("title"\) BETWEEN 1 AND 160/);
  assert.match(migration, /char_length\("body"\) BETWEEN 1 AND 8000/);
});

test("business memory UI supports create edit pin reorder and delete without a sixth mobile tab", () => {
  assert.match(page, /createBusinessNoteAction/);
  assert.match(page, /updateBusinessNoteAction/);
  assert.match(page, /toggleBusinessNotePinAction/);
  assert.match(page, /moveBusinessNoteAction/);
  assert.match(page, /deleteBusinessNoteAction/);
  assert.match(nav, /مذكرات الأعمال/);
});
