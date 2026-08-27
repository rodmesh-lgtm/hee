import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const activeHomepagePath = "components/homepage-professional.tsx";

test("active homepage publishes the same current monthly prices as the seeded paid plan catalog", () => {
  const homepage = source(activeHomepagePath);
  const seed = source("prisma/seed.ts");
  assert.match(seed, /code: "BUSINESS"[^\n]*monthlyPrice: 199/);
  assert.match(seed, /code: "PRO"[^\n]*monthlyPrice: 399/);
  assert.match(homepage, /199 ر\.س \/ شهر/);
  assert.match(homepage, /399 ر\.س \/ شهر/);
});

test("active homepage does not market premium themes before those themes are actually launch-ready", () => {
  const homepage = source(activeHomepagePath);
  assert.doesNotMatch(homepage, /ثيمات Business|ثيمات Pro|ثيمات إضافية ضمن الباقات/);
});

test("legacy premium homepage keeps the pre-payment amount disclosure while it remains in the repository", () => {
  const homepage = source("components/homepage-premium.tsx");
  assert.match(homepage, /يظهر المبلغ النهائي بوضوح قبل إدخال بيانات الدفع/);
});
