import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const theme = readFileSync(resolve(process.cwd(), "app/dashboard/dashboard-theme.css"), "utf8");

for (const token of [
  "bg-\\[\\#f2fcfa\\]",
  "bg-\\[\\#f3fcfa\\]",
  "bg-\\[\\#d8f8f3\\]",
  "border-\\[\\#bdece6\\]",
  "border-\\[\\#8edfd6\\]",
  "border-\\[\\#9ee9df\\]",
  "bg-sky-50",
  "bg-purple-50",
  "bg-violet-50",
]) {
  test(`dark workspace theme owns ${token}`, () => {
    assert.ok(theme.includes(token), `${token} must have an explicit authenticated dark-theme mapping`);
  });
}

test("business memory accent text remains readable in dark mode", () => {
  assert.match(theme, /text-\\\[\\#006f69\\\]/);
  assert.match(theme, /text-sky-900/);
  assert.match(theme, /text-purple-700/);
  assert.match(theme, /text-amber-950/);
});
