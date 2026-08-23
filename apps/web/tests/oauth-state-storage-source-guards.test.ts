import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("OAuth state is server-side, expiring and transactionally single-use", () => {
  assert.match(oauth, /db\.oAuthState\.create/);
  assert.match(oauth, /expiresAt: new Date\(Date\.now\(\) \+ 10 \* 60 \* 1000\)/);
  assert.match(oauth, /db\.\$transaction/);
  assert.match(oauth, /pg_advisory_xact_lock/);
  assert.match(oauth, /deleteMany\(\{ where: \{ id: record\.id, state \} \}\)/);
  assert.match(oauth, /consumed\.count !== 1/);
});
