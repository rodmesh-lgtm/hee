import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign creation UI counts only consent already effective at launch time", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/campaigns/page.tsx", import.meta.url), "utf8");
  assert.match(page, /consentedAt: \{ lte: new Date\(\) \}/);
  assert.match(page, /disabledAt: null/);
});
