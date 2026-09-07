import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const actions = readFileSync(resolve(process.cwd(), "app/actions/business-notes.ts"), "utf8");

test("saved business notes can continue into a reviewed reminder without auto-creating one", () => {
  assert.match(actions, /afterSave/);
  assert.match(actions, /===\s*"reminder"/);
  assert.match(actions, /continueToReminder/);
  assert.match(actions, /new URLSearchParams/);
  assert.match(actions, /noteId:input\.noteId/);
  assert.match(actions, /body:input\.body\.slice\(0,2000\)/);
  assert.match(actions, /redirect\(`\/dashboard\/reminders\?\$\{query\.toString\(\)\}`\)/);
  assert.doesNotMatch(actions, /createSmartReminder/);
});

test("note-to-reminder continuation keeps the note write audited and tenant scoped first", () => {
  assert.match(actions, /"businessId"=\$\{businessId\}/);
  assert.match(actions, /business_note\.create/);
  assert.match(actions, /continueToReminder:afterSave==="reminder"/);
  assert.match(actions, /Prisma\.TransactionIsolationLevel\.Serializable/);
});
