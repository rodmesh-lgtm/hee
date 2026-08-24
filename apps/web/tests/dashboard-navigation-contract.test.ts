import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const nav = readFileSync(join(root, "components/dashboard/dashboard-nav.ts"), "utf8");
const shell = readFileSync(join(root, "components/dashboard/dashboard-shell.tsx"), "utf8");

const visibleRoutes = [
  "/dashboard",
  "/dashboard/my-page",
  "/dashboard/digital-identity",
  "/dashboard/inbox",
  "/dashboard/branding",
  "/dashboard/directory",
  "/dashboard/analytics",
  "/dashboard/support",
  "/dashboard/settings",
];

const legacyRedirectRoutes = [
  "/dashboard/business",
  "/dashboard/businesses",
  "/dashboard/catalog",
  "/dashboard/contact-links",
  "/dashboard/gallery",
  "/dashboard/offers",
  "/dashboard/page-builder",
  "/dashboard/page-customization",
  "/dashboard/preview",
  "/dashboard/products",
  "/dashboard/share",
];

test("every visible dashboard destination has a shell title", () => {
  for (const route of visibleRoutes) {
    assert.match(nav, new RegExp(`href: ["']${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`));
    assert.match(shell, new RegExp(`["']${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s*:`));
  }
});

test("primary dashboard navigation never points to compatibility redirects", () => {
  for (const route of legacyRedirectRoutes) {
    assert.doesNotMatch(nav, new RegExp(`label:[^\\n]+href: ["']${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`));
  }
});

test("visible dashboard links are internal paths rather than placeholder actions", () => {
  assert.doesNotMatch(nav, /href:\s*["']#["']/);
  assert.doesNotMatch(nav, /href:\s*["']javascript:/i);
});
