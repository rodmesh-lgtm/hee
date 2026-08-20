import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const criticalDashboardFiles = [
  "app/dashboard/page.tsx",
  "app/dashboard/analytics/page.tsx",
  "app/dashboard/branding/page.tsx",
  "app/dashboard/directory/page.tsx",
  "app/dashboard/inbox/page.tsx",
  "app/dashboard/my-page/page.tsx",
  "app/dashboard/services/page.tsx",
  "app/dashboard/settings/page.tsx",
  "app/dashboard/working-hours/page.tsx",
  "app/preview/page.tsx",
];

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("tenant-private dashboard reads cannot fall back to owner-only findFirst selection", () => {
  for (const path of criticalDashboardFiles) {
    const text = source(path);
    assert.equal(
      /where\s*:\s*\{\s*ownerId\s*:\s*user\.id\s*,\s*deletedAt\s*:\s*null\s*\}/m.test(text),
      false,
      `${path} must resolve the active owned business instead of selecting an arbitrary business by ownerId`,
    );
  }
});

test("critical tenant writes continue to derive business scope from authenticated ownership", () => {
  const expectations: Array<[string, string]> = [
    ["app/api/dashboard/business/autosave/route.ts", "getOwnedBusinessForApiWrite"],
    ["app/actions/publication.ts", "getOwnedBusinessForWrite"],
    ["app/actions/services.ts", "getOwnedBusinessWithPlanForWrite"],
    ["app/actions/directory.ts", "getOwnedBusinessWithPlanForWrite"],
    ["app/actions/transactions.ts", "getOwnedBusinessForWrite"],
    ["app/actions/verification.ts", "getOwnedBusinessWithPlanForWrite"],
  ];
  for (const [path, guard] of expectations) {
    assert.match(source(path), new RegExp(`\\b${guard}\\b`), `${path} must keep ${guard} in its write path`);
  }
});

test("record-id tampering remains scoped by businessId at the write predicate", () => {
  const services = source("app/actions/services.ts");
  assert.match(
    services,
    /updateMany\(\{\s*where:\s*\{\s*id,\s*businessId:\s*business\.id,\s*deletedAt:\s*null\s*\}/m,
    "Service updates must require both the submitted record id and the authenticated active business id",
  );
  assert.match(
    services,
    /updateMany\(\{\s*where:\s*\{\s*id,\s*businessId:\s*business\.id,\s*deletedAt:\s*null\s*\},\s*data:\s*\{\s*deletedAt:/m,
    "Service soft deletes must require both the submitted record id and the authenticated active business id",
  );
});

test("active business cookie is never trusted without an owner-bound database lookup", () => {
  const activeBusiness = source("app/lib/active-business.ts");
  assert.match(activeBusiness, /id:\s*requestedId,\s*ownerId:\s*userId,\s*deletedAt:\s*null/);

  const switchAction = source("app/actions/active-business.ts");
  assert.match(switchAction, /id:\s*businessId,\s*ownerId:\s*user\.id,\s*deletedAt:\s*null/);
  assert.match(switchAction, /httpOnly:\s*true/);
  assert.match(switchAction, /sameSite:\s*"lax"/);
});

test("active business cookie stays Secure in every real production runtime", () => {
  const switchAction = source("app/actions/active-business.ts");
  assert.match(
    switchAction,
    /process\.env\.NODE_ENV\s*===\s*"production"\s*&&\s*process\.env\.APP_ENV\s*!==\s*"test"/,
    "Only the explicit CI test environment may relax Secure for local HTTP integration tests",
  );
  assert.match(switchAction, /secure:\s*activeBusinessCookieSecure\(\)/);
});
