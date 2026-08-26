#!/usr/bin/env node

// Production cutover trigger comment: no runtime behavior change.
import fs from "node:fs";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const MANAGED_HEE_NEON_HOST = "ep-delicate-wave-apf0pirn-pooler.c-7.us-east-1.aws.neon.tech";
const HEE_PRODUCTION_DATABASE = "hee_production";
const HEE_RESTORE_DATABASE = "hee_restore_production";

function fail(message) {
  console.error(`production-database-safety: FAIL ${message}`);
  process.exit(1);
}

function requiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) fail(`${name} is required`);
  return value;
}

function tryUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function maskAndPersist(name, value) {
  console.log(`::add-mask::${value}`);
  process.env[name] = value;
  const githubEnv = String(process.env.GITHUB_ENV ?? "").trim();
  if (githubEnv) fs.appendFileSync(githubEnv, `${name}=${value}\n`, "utf8");
}

function canonicalizeManagedHeeDatabases(sourceName, restoreName) {
  if (sourceName !== "DATABASE_URL") return;
  const sourceRaw = String(process.env[sourceName] ?? "").trim();
  const parsed = tryUrl(sourceRaw);
  if (!parsed || parsed.hostname.toLowerCase() !== MANAGED_HEE_NEON_HOST) return;

  parsed.pathname = `/${HEE_PRODUCTION_DATABASE}`;
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.set("sslmode", "verify-full");
  const canonicalSource = parsed.toString();
  maskAndPersist(sourceName, canonicalSource);

  if (restoreName) {
    const restore = new URL(canonicalSource);
    restore.pathname = `/${HEE_RESTORE_DATABASE}`;
    const canonicalRestore = restore.toString();
    maskAndPersist(restoreName, canonicalRestore);
  }

  console.log(`production-database-routing: PASS source=${HEE_PRODUCTION_DATABASE}${restoreName ? ` restore=${HEE_RESTORE_DATABASE}` : ""}`);
}

function parseDatabaseUrl(name, role) {
  let parsed;
  try {
    parsed = new URL(requiredEnv(name));
  } catch {
    fail(`${name} must be a valid PostgreSQL URL`);
  }

  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
    fail(`${name} must use PostgreSQL`);
  }
  if (!parsed.hostname || LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
    fail(`${name} must not point to a local host`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) fail(`${name} must name a database`);

  const sslModes = parsed.searchParams.getAll("sslmode");
  if (sslModes.length > 1) {
    fail(`${name} must contain at most one sslmode parameter`);
  }
  const sslMode = String(sslModes[0] ?? "").trim().toLowerCase();
  if (sslMode !== "verify-full") {
    fail(`${name} must use sslmode=verify-full for production operational tooling`);
  }

  if (role === "source" && /^(hee_ci|hee_restore(?:_|$))/i.test(database)) {
    fail(`${name} must target the production database, not CI/restore`);
  }
  if (role === "restore" && !/^hee_restore(?:_|$)/i.test(database)) {
    fail(`${name} restore database name must begin with hee_restore`);
  }

  if (parsed.hostname.toLowerCase() === MANAGED_HEE_NEON_HOST) {
    if (role === "source" && database !== HEE_PRODUCTION_DATABASE) {
      fail(`${name} must resolve to the isolated HEE production database`);
    }
    if (role === "restore" && database !== HEE_RESTORE_DATABASE) {
      fail(`${name} must resolve to the isolated HEE restore database`);
    }
  }

  return {
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    database,
  };
}

const [sourceName = "DATABASE_URL", restoreName] = process.argv.slice(2);
canonicalizeManagedHeeDatabases(sourceName, restoreName);
const source = parseDatabaseUrl(sourceName, "source");

if (restoreName) {
  const restore = parseDatabaseUrl(restoreName, "restore");
  const sourceIdentity = `${source.host}:${source.port}/${source.database}`;
  const restoreIdentity = `${restore.host}:${restore.port}/${restore.database}`;
  if (sourceIdentity === restoreIdentity) {
    fail(`${sourceName} and ${restoreName} resolve to the same PostgreSQL database identity`);
  }
}

console.log(`production-database-safety: PASS (${restoreName ? "source + isolated restore" : "source"}; sslmode=verify-full)`);
