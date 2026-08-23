import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const action = readFileSync(new URL("../app/actions/email-verification.ts", import.meta.url), "utf8");
const card = readFileSync(new URL("../components/dashboard/email-verification-card.tsx", import.meta.url), "utf8");

test("unverified email correction stays limited, serialized and revokes stale verification links", () => {
  assert.match(action, /changeUnverifiedEmailAction/);
  assert.match(action, /emailVerifiedAt/);
  assert.match(action, /passwordHash/);
  assert.match(action, /unverified-email-change:/);
  assert.match(action, /unverified-email-target:/);
  assert.match(action, /pg_advisory_xact_lock/);
  assert.match(action, /provider:\s*EMAIL_VERIFICATION_PROVIDER/);
  assert.match(action, /oAuthState\.deleteMany/);
  assert.match(action, /issueEmailVerification\(user\.id, nextEmail\)/);
  assert.match(action, /P2002/);
  assert.match(card, /تعديل البريد قبل التأكيد/);
  assert.match(card, /name="email"/);
  assert.match(card, /type="email"/);
});
