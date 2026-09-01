import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardLayout = readFileSync(new URL("../app/dashboard/layout.tsx", import.meta.url), "utf8");
const rootLayout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const brandCompat = readFileSync(new URL("../app/ir-brand-compat.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/dashboard/dashboard-shell.tsx", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../components/onboarding-client.tsx", import.meta.url), "utf8");
const forgotPassword = readFileSync(new URL("../app/forgot-password/page.tsx", import.meta.url), "utf8");
const resetPassword = readFileSync(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8");
const contact = readFileSync(new URL("../app/contact/page.tsx", import.meta.url), "utf8");
const adminError = readFileSync(new URL("../app/admin/error.tsx", import.meta.url), "utf8");

test("dashboard provides a keyboard skip path to the main customer content", () => {
  assert.match(dashboardLayout, /href="#dashboard-main-content"/);
  assert.match(dashboardLayout, /id="dashboard-main-content"/);
  assert.match(dashboardLayout, /tabIndex=\{-1\}/);
  assert.match(dashboardLayout, /الانتقال إلى المحتوى الرئيسي/);
});

test("dashboard preserves core RTL and keyboard accessibility contracts", () => {
  assert.match(rootLayout, /lang=\{localeMeta\.htmlLang\}/);
  assert.match(rootLayout, /dir=\{localeMeta\.dir\}/);
  assert.match(globals, /:focus-visible/);
  assert.match(globals, /prefers-reduced-motion: reduce/);
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(shell, /role="dialog"/);
  assert.match(shell, /aria-modal=\{mobileOpen \? "true" : undefined\}/);
  assert.match(shell, /event\.key === "Escape"/);
  assert.match(shell, /event\.key !== "Tab"/);
});

test("onboarding exposes progress, errors and pending state accessibly", () => {
  assert.match(onboarding, /role="progressbar"/);
  assert.match(onboarding, /aria-valuenow=\{step \+ 1\}/);
  assert.match(onboarding, /role="alert"/);
  assert.match(onboarding, /aria-live="assertive"/);
  assert.match(onboarding, /aria-busy=\{pending\}/);
  assert.match(onboarding, />iR</);
  assert.doesNotMatch(onboarding, />HEE</);
});

test("password recovery and public support use iR with accessible live feedback", () => {
  for (const source of [forgotPassword, resetPassword, contact, adminError]) {
    assert.doesNotMatch(source, />HEE</);
  }
  assert.match(forgotPassword, /role="status"/);
  assert.match(forgotPassword, /role="alert"/);
  assert.match(forgotPassword, /aria-busy=\{pending\}/);
  assert.match(resetPassword, /aria-live="assertive"/);
  assert.match(resetPassword, /aria-busy=\{pending\}/);
  assert.match(contact, /عملاء iR/);
  assert.match(adminError, /aria-live="assertive"/);
});

test("legacy renderer identifiers cannot leak legacy HEE branding to customers", () => {
  assert.match(rootLayout, /import "\.\/ir-brand-compat\.css"/);
  assert.match(brandCompat, /content: "iR · صفحة أعمال ذكية"/);
  assert.doesNotMatch(brandCompat, /content:\s*"HEE/);
});
