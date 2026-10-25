import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { HOMEPAGE_TRANSLATIONS, homepageText } from "../app/lib/homepage-i18n";
import { SUPPORTED_LOCALES } from "../app/lib/i18n";
import { COMMERCIAL_PLANS, PLAN_BILLING_NOTE } from "../app/lib/commercial-plans";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("all homepage copy, including hidden FAQs, status messages and accessible labels, has all five languages", () => {
  const strings = new Set<string>([PLAN_BILLING_NOTE]);
  for (const path of ["components/homepage-professional.tsx", "components/home-phone-preview.tsx"]) {
    const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) && /[\u0600-\u06ff]/.test(node.text)) strings.add(node.text);
      assert.ok(!(ts.isJsxText(node) && /[\u0600-\u06ff]/.test(node.text)), "Static JSX text bypasses localization");
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  for (const plan of COMMERCIAL_PLANS) {
    strings.add(plan.name); strings.add(plan.description);
    plan.features.forEach(feature => strings.add(feature));
  }
  for (const text of strings) for (const locale of SUPPORTED_LOCALES) {
    const actual = homepageText(locale, text);
    if (locale === "ar") assert.equal(actual, text);
    else {
      assert.ok(HOMEPAGE_TRANSLATIONS[text]?.[locale]?.trim(), `${locale} missing: ${text}`);
      assert.notEqual(actual, text, `${locale} fell back to Arabic: ${text}`);
      if (locale !== "ur") assert.doesNotMatch(actual, /[\u0600-\u06ff]/, "Unexpected Arabic in translated copy");
    }
  }
});

test("translated prices and quotas retain the canonical commercial amounts and restrictions", () => {
  assert.deepEqual(COMMERCIAL_PLANS.map(plan => plan.monthlyPrice), [0, 117, 214, 491]);
  for (const locale of SUPPORTED_LOCALES.filter(locale => locale !== "ar")) {
    const note = homepageText(locale, PLAN_BILLING_NOTE);
    assert.match(note, /Meta/);
    assert.match(note, /INFRO/);
    for (const amount of ["45", "50", "2"]) assert.ok(homepageText(locale, COMMERCIAL_PLANS[3].features[2]).includes(amount));
    assert.match(homepageText(locale, "رائع، ir.sa/{slug} متاح الآن").replace("{slug}", "test-business"), /ir\.sa\/test-business/);
  }
});

test("homepage reads the same server locale as the switcher and uses it for copy, metadata and direction", () => {
  const page = read("app/page.tsx");
  const home = read("components/homepage-professional.tsx");
  assert.match(page, /getRequestLocale\(\)/);
  assert.match(page, /HomepageProfessional locale=\{locale\}/);
  assert.match(page, /locale:site\.ogLocale/);
  assert.match(home, /LOCALE_META\[locale\]\.dir/);
  assert.match(home, /data-infro-home dir=\{direction\}/);
  assert.doesNotMatch(home, /dir="rtl"|lg:text-right/);
  assert.match(home, /locale === "ar" && design\.homeHeroTitleAr/);
});
