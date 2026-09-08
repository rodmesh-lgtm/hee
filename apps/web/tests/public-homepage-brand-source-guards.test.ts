import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homepage = new URL("../components/homepage-professional.tsx", import.meta.url);
const page = new URL("../app/page.tsx", import.meta.url);
const logo = new URL("../components/brand/ir-logo.tsx", import.meta.url);

function normalize(value: string) {
  return value.replace(/\s+/g, " ");
}

test("public homepage exposes INFRO as the product brand while preserving ir.sa as the domain", async () => {
  const [homepageSource, pageSource] = await Promise.all([
    readFile(homepage, "utf8").then(normalize),
    readFile(page, "utf8").then(normalize),
  ]);

  assert.match(pageSource, /INFRO \| هويتك الرقمية والتسويقية/);
  assert.match(homepageSource, /aria-label="INFRO"/);
  assert.match(homepageSource, /عن INFRO/);
  assert.match(homepageSource, /INFRO للهوية الرقمية والتسويقية/);
  assert.match(homepageSource, /منظومة INFRO/);
  assert.match(homepageSource, /منصة INFRO/);
  assert.match(homepageSource, /صُممت INFRO/);
  assert.match(homepageSource, /على INFRO/);
  assert.match(homepageSource, /صفحة أعمال INFRO/);
  assert.match(homepageSource, /ir\.sa\//);

  for (const legacyVisibleCopy of [
    "عن iR",
    "iR لهوية الأعمال الرقمية",
    "iR مشروع تقني سعودي",
    "منظومة iR",
    "منصة iR",
    "صُممت iR",
    "على iR",
    "صفحة أعمال iR",
  ]) {
    assert.equal(homepageSource.includes(legacyVisibleCopy), false, `legacy public copy remains: ${legacyVisibleCopy}`);
  }
});

test("public homepage does not regress to the retired purple interface palette", async () => {
  const source = normalize(await readFile(homepage, "utf8"));
  for (const retiredColor of ["#6841d8", "#5b34c9", "#f1ebff", "#17122a", "#141027"]) {
    assert.equal(source.toLowerCase().includes(retiredColor), false, `retired public palette remains: ${retiredColor}`);
  }
  assert.match(source, /#008f87/);
  assert.match(source, /#00bfae/);
  assert.match(source, /#07181b/);
  assert.match(source, /#061619/);
});

test("shared INFRO lockup uses the current production logo asset", async () => {
  const source = normalize(await readFile(logo, "utf8"));
  assert.match(source, /src="\/brand\/ir-logo\.png"/);
  assert.doesNotMatch(source, /ir-logo-original\.webp/);
  assert.match(source, /YOUR DIGITAL &amp; MARKETING IDENTITY/);
});
