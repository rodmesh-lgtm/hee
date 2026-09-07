import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const actions = readFileSync(resolve(process.cwd(), "app/actions/business-notes.ts"), "utf8");
const page = readFileSync(resolve(process.cwd(), "app/dashboard/notes/page.tsx"), "utf8");

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

test("business memory UI makes the reviewed continuation an explicit user choice", () => {
  assert.match(page, /name="afterSave"/);
  assert.match(page, /value="reminder"/);
  assert.match(page, /حفظ ثم إعداد تذكير/);
  assert.match(page, /لا يتم إنشاء أو إرسال أي تذكير تلقائيًا/);
});

test("note-to-reminder continuation keeps the note write audited and tenant scoped first", () => {
  assert.match(actions, /"businessId"=\$\{businessId\}/);
  assert.match(actions, /business_note\.create/);
  assert.match(actions, /continueToReminder:afterSave==="reminder"/);
  assert.match(actions, /Prisma\.TransactionIsolationLevel\.Serializable/);
});
