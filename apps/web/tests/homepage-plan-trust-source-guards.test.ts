import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("homepage publishes the same current monthly prices as the seeded paid plan catalog", () => {
  const homepage = source("components/homepage-premium.tsx");
  const seed = source("prisma/seed.ts");
  assert.match(seed, /code: "BUSINESS"[^\n]*monthlyPrice: 199/);
  assert.match(seed, /code: "PRO"[^\n]*monthlyPrice: 399/);
  assert.match(homepage, /199 ر\.س \/ شهر/);
  assert.match(homepage, /399 ر\.س \/ شهر/);
});

test("homepage does not market premium themes before those themes are actually launch-ready", () => {
  const homepage = source("components/homepage-premium.tsx");
  assert.doesNotMatch(homepage, /ثيمات Business|ثيمات Pro|ثيمات إضافية ضمن الباقات/);
  assert.match(homepage, /يظهر المبلغ النهائي بوضوح قبل إدخال بيانات الدفع/);
});
