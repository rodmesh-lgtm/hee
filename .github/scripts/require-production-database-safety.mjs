#!/usr/bin/env node

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

function isPostgresUrl(value) {
  const parsed = tryUrl(value);
  return Boolean(parsed && new Set(["postgres:", "postgresql:"]).has(parsed.protocol));
}

function maskAndPersist(name, value) {
  console.log(`::add-mask::${value}`);
  process.env[name] = value;
  const githubEnv = String(process.env.GITHUB_ENV ?? "").trim();
  if (githubEnv) fs.appendFileSync(githubEnv, `${name}=${value}\n`, "utf8");
}

function canonicalManagedUrl(raw, database) {
  const parsed = tryUrl(raw);
  if (!parsed || !new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
    fail("Vercel Production DATABASE_URL must be a PostgreSQL URL");
  }
  if (parsed.hostname.toLowerCase() !== MANAGED_HEE_NEON_HOST) {
    fail("Vercel Production DATABASE_URL does not target the isolated HEE Neon endpoint");
  }
  if (!parsed.username || !parsed.password) {
    fail("Vercel Production DATABASE_URL must contain database credentials");
  }
  parsed.pathname = `/${database}`;
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.set("sslmode", "verify-full");
  return parsed.toString();
}

async function resolveProductionDatabaseFromVercel(sourceName, restoreName) {
  if (sourceName !== "DATABASE_URL" || isPostgresUrl(process.env[sourceName])) return;

  const token = requiredEnv("VERCEL_TOKEN");
  const projectId = requiredEnv("VERCEL_PROJECT_ID");
  const teamId = requiredEnv("VERCEL_ORG_ID");
  const endpoint = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env?teamId=${encodeURIComponent(teamId)}&decrypt=true`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) fail(`unable to read Vercel Production environment (${response.status})`);

  const body = await response.json();
  const envs = Array.isArray(body?.envs) ? body.envs : [];
  const candidates = envs.filter((item) => {
    if (String(item?.key ?? "") !== "DATABASE_URL") return false;
    const targets = Array.isArray(item?.target) ? item.target.map((value) => String(value).toLowerCase()) : [];
    return targets.includes("production");
  });
  if (candidates.length !== 1) {
    fail(`Vercel must expose exactly one Production DATABASE_URL (found ${candidates.length})`);
  }

  const runtimeUrl = String(candidates[0]?.value ?? "").trim();
  const source = canonicalManagedUrl(runtimeUrl, HEE_PRODUCTION_DATABASE);
  maskAndPersist(sourceName, source);
  if (restoreName) maskAndPersist(restoreName, canonicalManagedUrl(runtimeUrl, HEE_RESTORE_DATABASE));
  console.log("production-database-runtime-source: PASS Vercel Production environment");
}

function canonicalizeManagedHeeDatabases(sourceName, restoreName) {
  if (sourceName !== "DATABASE_URL") return;
  const sourceRaw = String(process.env[sourceName] ?? "").trim();
  const parsed = tryUrl(sourceRaw);
  if (!parsed || parsed.hostname.toLowerCase() !== MANAGED_HEE_NEON_HOST) return;
  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) return;

  parsed.pathname = `/${HEE_PRODUCTION_DATABASE}`;
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.set("sslmode", "verify-full");
  const canonicalSource = parsed.toString();
  maskAndPersist(sourceName, canonicalSource);

  if (restoreName) {
    const restore = new URL(canonicalSource);
    restore.pathname = `/${HEE_RESTORE_DATABASE}`;
    maskAndPersist(restoreName, restore.toString());
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

  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) fail(`${name} must use PostgreSQL`);
  if (!parsed.hostname || LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) fail(`${name} must not point to a local host`);

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) fail(`${name} must name a database`);

  const sslModes = parsed.searchParams.getAll("sslmode");
  if (sslModes.length > 1) fail(`${name} must contain at most one sslmode parameter`);
  const sslMode = String(sslModes[0] ?? "").trim().toLowerCase();
  if (sslMode !== "verify-full") fail(`${name} must use sslmode=verify-full for production operational tooling`);

  if (role === "source" && /^(hee_ci|hee_restore(?:_|$))/i.test(database)) fail(`${name} must target the production database, not CI/restore`);
  if (role === "restore" && !/^hee_restore(?:_|$)/i.test(database)) fail(`${name} restore database name must begin with hee_restore`);

  if (parsed.hostname.toLowerCase() === MANAGED_HEE_NEON_HOST) {
    if (role === "source" && database !== HEE_PRODUCTION_DATABASE) fail(`${name} must resolve to the isolated HEE production database`);
    if (role === "restore" && database !== HEE_RESTORE_DATABASE) fail(`${name} must resolve to the isolated HEE restore database`);
  }

  return { host: parsed.hostname.toLowerCase(), port: parsed.port || "5432", database };
}

const [sourceName = "DATABASE_URL", restoreName] = process.argv.slice(2);
await resolveProductionDatabaseFromVercel(sourceName, restoreName);
canonicalizeManagedHeeDatabases(sourceName, restoreName);
const source = parseDatabaseUrl(sourceName, "source");

if (restoreName) {
  const restore = parseDatabaseUrl(restoreName, "restore");
  const sourceIdentity = `${source.host}:${source.port}/${source.database}`;
  const restoreIdentity = `${restore.host}:${restore.port}/${restore.database}`;
  if (sourceIdentity === restoreIdentity) fail(`${sourceName} and ${restoreName} resolve to the same PostgreSQL database identity`);
}

console.log(`production-database-safety: PASS (${restoreName ? "source + isolated restore" : "source"}; sslmode=verify-full)`);
