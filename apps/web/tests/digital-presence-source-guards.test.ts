import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("digital presence editor validates official social hosts and SEO bounds", () => {
  const action = read("app/actions/digital-presence.ts");
  assert.match(action, /instagram\.com/);
  assert.match(action, /x\.com/);
  assert.match(action, /tiktok\.com/);
  assert.match(action, /snapchat\.com/);
  assert.match(action, /facebook\.com/);
  assert.match(action, /metaTitle: z\.string\(\)\.trim\(\)\.max\(70\)/);
  assert.match(action, /metaDescription: z\.string\(\)\.trim\(\)\.max\(180\)/);
  assert.match(action, /parsed\.username/);
  assert.match(action, /parsed\.password/);
});

test("digital presence validation reports the exact rejected field", () => {
  const action = read("app/actions/digital-presence.ts");
  const form = read("components/dashboard/digital-presence-form.tsx");
  for (const status of ["invalid-email", "invalid-url", "invalid-instagram", "invalid-x", "invalid-tiktok", "invalid-snapchat", "invalid-facebook", "invalid-metaTitle", "invalid-metaDescription", "rate-limited"]) {
    assert.match(action + form, new RegExp(status));
  }
  assert.match(form, /aria-invalid/);
  assert.match(form, /جميع الحقول اختيارية/);
});

test("digital presence writes serialize with autosave and preserve published contact availability", () => {
  const action = read("app/actions/digital-presence.ts");
  assert.match(action, /business-autosave:/);
  assert.match(action, /pg_advisory_xact_lock/);
  assert.match(action, /current\.isPublished/);
  assert.match(action, /contact-required/);
  assert.match(action, /ownerId: user\.id/);
  assert.match(action, /deletedAt: null/);
});

test("identity center exposes editable business presence and public page surfaces official socials", () => {
  const form = read("components/dashboard/digital-presence-form.tsx");
  const page = read("app/[slug]/page.tsx");
  const highlights = read("components/public/public-identity-highlights.tsx");
  for (const field of ["nameEn", "email", "website", "address", "instagramUrl", "xUrl", "tiktokUrl", "snapchatUrl", "facebookUrl", "metaTitle", "metaDescription"]) {
    assert.match(form, new RegExp(`name=\\"${field}\\"`));
  }
  assert.match(page, /PublicIdentityHighlights/);
  assert.match(highlights, /حساباتنا الرسمية/);
  assert.match(page, /business\.metaTitle/);
  assert.match(page, /business\.metaDescription/);
  assert.match(page, /sameAs/);
});
