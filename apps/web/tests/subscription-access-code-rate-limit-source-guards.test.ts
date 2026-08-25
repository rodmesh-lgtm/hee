import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const action = readFileSync(new URL("../app/actions/subscription-access-code.ts", import.meta.url), "utf8");

test("access-code redemption fails closed when the shared limiter is unavailable", () => {
  assert.match(action, /try \{[\s\S]*consumePublicWriteLimit[\s\S]*\} catch \(error\) \{[\s\S]*rate_limit_failed[\s\S]*code=rate-limited/);
  assert.match(action, /if \(!rateAllowed\) redirect\("\/dashboard\/billing\/manage\?code=rate-limited"\);/);
});
