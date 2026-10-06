import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync("app/dashboard/inbox/page.tsx", "utf8");
const compact = source.replace(/\s/g, "");
test("orders keep all actionable records and bound history independently", () => {
 assert.match(compact, /activeOrderStatuses=\["pending","confirmed","processing"\]/);
 assert.match(compact, /status:\{in:activeOrderStatuses\}/);
 assert.match(compact, /status:\{notIn:activeOrderStatuses\}/);
 assert.match(compact, /take:HISTORY_LIMIT/);
 assert.match(compact, /HISTORY_LIMIT=50/);
 assert.doesNotMatch(source, /db\.booking\./);
 assert.match(source, /href="\/dashboard\/appointments"/);
});
