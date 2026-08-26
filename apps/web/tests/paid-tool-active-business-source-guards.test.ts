import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("paid offer designer resolves the dashboard active business and its entitlements", () => {
  const page = source("app/dashboard/tools/offers/page.tsx");
  assert.match(page, /getActiveBusinessWithPlanForUser\(user\.id\)/);
  assert.doesNotMatch(page, /db\.business\.findFirst/);
  assert.match(page, /getPlanEntitlements\(business\.plan\?\.code\)/);
});

test("locked offer designer names the required plan rather than the customer's current plan", () => {
  const page = source("app/dashboard/tools/page.tsx");
  assert.match(page, /designerAvailable \? "متاح" : "يتطلب Business"/);
  assert.doesNotMatch(page, /designerAvailable \? "متاح" : `ضمن \$\{entitlements\.label\}`/);
});
