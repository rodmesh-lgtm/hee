import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(here, "../package.json"), "utf8")) as { scripts?: Record<string, string> };
const source = readFileSync(join(here, "../scripts/assert-rc-preview-schema-current.mjs"), "utf8");

test("production build runs the RC Preview schema gate before compiling", () => {
  const build = packageJson.scripts?.build ?? "";
  assert.match(build, /^node scripts\/assert-rc-preview-schema-current\.mjs && /);
});

test("RC Preview schema gate is scoped to Vercel Preview and hee-v6-rc", () => {
  assert.match(source, /VERCEL_ENV/);
  assert.match(source, /VERCEL_GIT_COMMIT_REF === "hee-v6-rc"/);
  assert.match(source, /DATABASE_URL is unavailable/);
});

test("RC Preview schema gate rejects migration drift and critical registration schema drift", () => {
  assert.match(source, /pending\.length > 0/);
  assert.match(source, /unexpected\.length > 0/);
  assert.match(source, /failed\.length > 0/);
  assert.match(source, /LegalConsent/);
  assert.match(source, /emailVerifiedAt/);
  assert.match(source, /BillingOperationsHeartbeat/);
  assert.match(source, /analyticsMetadataType !== "jsonb"/);
});
