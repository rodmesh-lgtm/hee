import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("platform admin authorization and navigation require verified mailbox ownership in addition to the email allowlist", () => {
  const admin = source("app/lib/admin.ts");
  const auth = source("app/actions/auth.ts");
  const dashboardLayout = source("app/dashboard/layout.tsx");

  assert.match(admin, /if \(!user\.emailVerifiedAt \|\| !isAdminEmail\(user\.email\)\) notFound\(\)/);
  assert.match(admin, /isQaAuditModeUser\(user\.id\)/);
  assert.match(dashboardLayout, /showAdminLink=\{!qaAuditUser && Boolean\(user\.emailVerifiedAt\) && isAdminEmail\(user\.email\)\}/);

  // Registration intentionally establishes a normal customer session before the
  // verification email completes, so requireAdmin must never regress to email-only
  // authorization even if the address appears in HEE_ADMIN_EMAILS.
  assert.match(auth, /await createSession\(user\.id\)/);
  assert.match(auth, /await issueEmailVerification\(user\.id, parsed\.data\.email\)/);
});
