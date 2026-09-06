import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(process.cwd(), "app/dashboard/reminders/page.tsx"), "utf8");

test("smart reminders surface overdue paused attention and completed operational states", () => {
  assert.match(page, /"overdue"/);
  assert.match(page, /"paused"/);
  assert.match(page, /"attention"/);
  assert.match(page, /المتأخرة/);
  assert.match(page, /تحتاج إجراء/);
  assert.match(page, /NEXT ACTION/);
  assert.match(page, /delivery_unknown/);
  assert.match(page, /failed/);
});

test("reminder cards preserve tenant-safe linked business note navigation", () => {
  assert.match(page, /r\."businessNoteId"/);
  assert.match(page, /n\."businessId" = r\."businessId"/);
  assert.match(page, /businessNoteTitle/);
  assert.match(page, /\/dashboard\/notes\?q=/);
});
