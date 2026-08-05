import test from "node:test";
import assert from "node:assert/strict";
import { resolveOnboardingRedirect } from "./onboarding";

test("redirects unpublished businesses to the onboarding flow", () => {
  assert.equal(resolveOnboardingRedirect("business_details_completed", false), "/onboarding?step=page-setup");
});

test("redirects published businesses to the dashboard", () => {
  assert.equal(resolveOnboardingRedirect("published", true), "/dashboard");
});

test("defaults new accounts to the first onboarding step", () => {
  assert.equal(resolveOnboardingRedirect("account_created", false), "/onboarding");
});
