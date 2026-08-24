import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALE_META, SITE_MESSAGES, SUPPORTED_LOCALES } from "../app/lib/i18n";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("HEE exposes the five requested locales", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["ar", "en", "zh-CN", "es", "ur"]);
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(LOCALE_META[locale].nativeLabel.length > 0);
    assert.ok(SITE_MESSAGES[locale].title.includes("HEE"));
    assert.ok(SITE_MESSAGES[locale].description.length > 20);
  }
});

test("Arabic and Urdu are RTL while English Chinese and Spanish are LTR", () => {
  assert.equal(LOCALE_META.ar.dir, "rtl");
  assert.equal(LOCALE_META.ur.dir, "rtl");
  assert.equal(LOCALE_META.en.dir, "ltr");
  assert.equal(LOCALE_META["zh-CN"].dir, "ltr");
  assert.equal(LOCALE_META.es.dir, "ltr");
});

test("root document language direction and metadata resolve from locale preference", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /getRequestLocale\(\)/);
  assert.match(layout, /lang=\{localeMeta\.htmlLang\}/);
  assert.match(layout, /dir=\{localeMeta\.dir\}/);
  assert.match(layout, /SITE_MESSAGES\[locale\]/);
  assert.match(layout, /LanguageSwitcher/);
});

test("locale preference is strict, durable and cannot become an open redirect", () => {
  const action = read("app/actions/locale.ts");
  assert.match(action, /isAppLocale\(locale\)/);
  assert.match(action, /httpOnly: true/);
  assert.match(action, /sameSite: "lax"/);
  assert.match(action, /maxAge: 60 \* 60 \* 24 \* 365/);
  assert.match(action, /!raw\.startsWith\("\/"\)/);
  assert.match(action, /raw\.startsWith\("\/\/"\)/);
});

test("global language control stays clear of the mobile dashboard navigation", () => {
  const switcher = read("components/language-switcher.tsx");
  assert.match(switcher, /pathname === "\/dashboard" \|\| pathname\.startsWith\("\/dashboard\/"\)/);
  assert.match(switcher, /bottom-20 lg:bottom-4/);
});
