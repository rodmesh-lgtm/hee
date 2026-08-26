#!/usr/bin/env node

import fs from "node:fs";

function fail(message) {
  console.error(`resolve-hee-production-database-urls: FAIL ${message}`);
  process.exit(1);
}

const source = String(process.env.DATABASE_URL ?? "").trim();
if (!source) fail("DATABASE_URL is required");

let sourceUrl;
try {
  sourceUrl = new URL(source);
} catch {
  fail("DATABASE_URL must be a valid URL");
}

if (!new Set(["postgres:", "postgresql:"]).has(sourceUrl.protocol)) {
  fail("DATABASE_URL must use PostgreSQL");
}

const expectedHost = String(process.env.EXPECTED_PRODUCTION_DB_HOST ?? "").trim().toLowerCase();
if (expectedHost && sourceUrl.hostname.toLowerCase() !== expectedHost) {
  fail(`unexpected database host ${sourceUrl.hostname}`);
}

function withDatabase(databaseName) {
  const url = new URL(sourceUrl.toString());
  url.pathname = `/${databaseName}`;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}

const databaseUrl = withDatabase("hee_production");
const restoreDatabaseUrl = withDatabase("hee_restore_production");

for (const value of [databaseUrl, restoreDatabaseUrl]) {
  console.log(`::add-mask::${value}`);
}

const githubEnv = String(process.env.GITHUB_ENV ?? "").trim();
if (!githubEnv) fail("GITHUB_ENV is required");

fs.appendFileSync(githubEnv, `DATABASE_URL=${databaseUrl}\nRESTORE_DATABASE_URL=${restoreDatabaseUrl}\n`, "utf8");
console.log("resolve-hee-production-database-urls: PASS source=hee_production restore=hee_restore_production");
