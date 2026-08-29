#!/usr/bin/env node

import fs from "node:fs";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const HEE_PRODUCTION_DATABASE = "hee_production";
const HEE_RESTORE_DATABASE = "hee_restore_production";
const PRISMA_POSTGRES_DIRECT_HOST = "db.prisma.io";
const MANAGED_DATABASE_KEYS = new Set([
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL_NO_SSL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
]);

function fail(message) {
  console.error(`production-database-safety: FAIL ${message}`);
  process.exit(1);
}

function requiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) fail(`${name} is required`);
  return value;
}

function expectedProductionHost({ required = false } = {}) {
  const value = String(process.env.EXPECTED_PRODUCTION_DB_HOST ?? "").trim().toLowerCase();
  if (required && !value) fail("EXPECTED_PRODUCTION_DB_HOST is required before resolving Production database credentials");
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

function isPrismaPostgresDirectHost(host) {
  return String(host ?? "").trim().toLowerCase() === PRISMA_POSTGRES_DIRECT_HOST;
}

function maskAndPersist(name, value) {
  console.log(`::add-mask::${value}`);
  process.env[name] = value;
  const githubEnv = String(process.env.GITHUB_ENV ?? "").trim();
  if (githubEnv) fs.appendFileSync(githubEnv, `${name}=${value}\n`, "utf8");
}

function canonicalManagedUrl(raw, database, sourceLabel = "managed database source") {
  const parsed = tryUrl(raw);
  if (!parsed || !new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
    fail(`${sourceLabel} must be a PostgreSQL URL`);
  }
  const expectedHost = expectedProductionHost({ required: true });
  if (parsed.hostname.toLowerCase() !== expectedHost) {
    fail(`${sourceLabel} does not target the configured isolated HEE Production database host`);
  }
  if (!parsed.username || !parsed.password) {
    fail(`${sourceLabel} must contain database credentials`);
  }
  parsed.pathname = `/${database}`;
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.set("sslmode", "verify-full");
  return parsed.toString();
}

function productionTarget(item) {
  const targets = Array.isArray(item?.target) ? item.target.map((value) => String(value).toLowerCase()) : [];
  return targets.includes("production");
}

function managedCandidate(item, expectedHost) {
  const key = String(item?.key ?? "").trim();
  if (!MANAGED_DATABASE_KEYS.has(key) || !productionTarget(item)) return null;
  const raw = String(item?.value ?? "").trim();
  const parsed = tryUrl(raw);
  if (!parsed || !new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) return null;
  if (parsed.hostname.toLowerCase() !== expectedHost) return null;
  if (!parsed.username || !parsed.password) return null;
  return { key, raw, identity: `${parsed.protocol}//${parsed.username}@${parsed.hostname}:${parsed.port || "5432"}` };
}

async function resolveProductionDatabaseFromVercel(sourceName, restoreName) {
  if (sourceName !== "DATABASE_URL" || isPostgresUrl(process.env[sourceName])) return;

  const expectedHost = expectedProductionHost({ required: true });
  if (isPrismaPostgresDirectHost(expectedHost)) {
    fail("PRODUCTION_DATABASE_URL must contain the Prisma Postgres direct PostgreSQL connection string for db.prisma.io; Vercel runtime variables are pooled/application credentials and cannot be used for pg_dump, pg_restore, or migrations");
  }
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
  const candidates = envs.map((item) => managedCandidate(item, expectedHost)).filter(Boolean);
  if (candidates.length === 0) {
    const knownKeys = envs
      .filter((item) => productionTarget(item) && MANAGED_DATABASE_KEYS.has(String(item?.key ?? "").trim()))
      .map((item) => String(item.key))
      .sort();
    fail(`Vercel Production has no valid isolated HEE PostgreSQL credential for EXPECTED_PRODUCTION_DB_HOST among managed database keys${knownKeys.length ? ` (present: ${knownKeys.join(", ")})` : ""}`);
  }

  const identities = new Set(candidates.map((candidate) => candidate.identity));
  if (identities.size !== 1) {
    fail(`Vercel Production exposes multiple distinct isolated HEE database credentials (${candidates.map((candidate) => candidate.key).join(", ")})`);
  }

  const priority = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "NEON_POSTGRES_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL_NO_SSL"];
  candidates.sort((a, b) => priority.indexOf(a.key) - priority.indexOf(b.key));
  const selected = candidates[0];
  const source = canonicalManagedUrl(selected.raw, HEE_PRODUCTION_DATABASE, `Vercel Production ${selected.key}`);
  maskAndPersist(sourceName, source);
  if (restoreName) maskAndPersist(restoreName, canonicalManagedUrl(selected.raw, HEE_RESTORE_DATABASE, `Vercel Production ${selected.key}`));
  console.log(`production-database-runtime-source: PASS key=${selected.key} candidates=${candidates.length}`);
}

function canonicalizeManagedHeeDatabases(sourceName, restoreName) {
  if (sourceName !== "DATABASE_URL") return;
  const expectedHost = expectedProductionHost();
  if (!expectedHost) return;

  const sourceRaw = String(process.env[sourceName] ?? "").trim();
  const parsed = tryUrl(sourceRaw);
  if (!parsed || parsed.hostname.toLowerCase() !== expectedHost) return;
  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) return;

  // Prisma Postgres direct credentials identify a provisioned database rather
  // than a database-name route. Rewriting their pathname to HEE's historic
  // Neon names would point operational tooling at a database that does not
  // exist. The two explicit GitHub production secrets remain required and are
  // canonicalised independently below.
  if (isPrismaPostgresDirectHost(expectedHost)) return;

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

function canonicalizePrismaPostgresDirectUrls(sourceName, restoreName) {
  const expectedHost = expectedProductionHost();
  if (!isPrismaPostgresDirectHost(expectedHost)) return;

  for (const name of [sourceName, restoreName].filter(Boolean)) {
    const parsed = tryUrl(String(process.env[name] ?? "").trim());
    if (!parsed || parsed.hostname.toLowerCase() !== expectedHost) continue;
    if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) continue;
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.set("sslmode", "verify-full");
    maskAndPersist(name, parsed.toString());
  }

  console.log("production-database-routing: PASS explicit Prisma Postgres direct source and restore credentials");
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

  const expectedHost = expectedProductionHost();
  // The production source is pinned to its approved host. The restore target
  // is deliberately isolated and may be hosted separately (for example, on
  // the existing Neon restore database), so it must not be forced onto the
  // production Prisma Postgres host.
  if (expectedHost && role === "source" && parsed.hostname.toLowerCase() !== expectedHost) {
    fail(`${name} must target EXPECTED_PRODUCTION_DB_HOST`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const prismaDirect = isPrismaPostgresDirectHost(parsed.hostname);
  if (!database && !prismaDirect) fail(`${name} must name a database`);
  if (prismaDirect && (!parsed.username || !parsed.password)) {
    fail(`${name} must contain a Prisma Postgres direct credential`);
  }

  const sslModes = parsed.searchParams.getAll("sslmode");
  if (sslModes.length > 1) fail(`${name} must contain at most one sslmode parameter`);
  const sslMode = String(sslModes[0] ?? "").trim().toLowerCase();
  if (sslMode !== "verify-full") fail(`${name} must use sslmode=verify-full for production operational tooling`);

  if (!prismaDirect && role === "source" && /^(hee_ci|hee_restore(?:_|$))/i.test(database)) fail(`${name} must target the production database, not CI/restore`);
  // A separately hosted restore target (for example, the existing isolated Neon branch)
  // is isolated by its distinct host and need not use the legacy HEE restore name.
  const restoreUsesSeparateHost = role === "restore" && expectedHost && parsed.hostname.toLowerCase() !== expectedHost;
  if (!prismaDirect && role === "restore" && !restoreUsesSeparateHost && !/^hee_restore(?:_|$)/i.test(database)) fail(`${name} restore database name must begin with hee_restore`);

  if (expectedHost && !prismaDirect) {
    if (role === "source" && database !== HEE_PRODUCTION_DATABASE) fail(`${name} must resolve to the isolated HEE production database`);
    if (role === "restore" && parsed.hostname.toLowerCase() === expectedHost && database !== HEE_RESTORE_DATABASE) fail(`${name} must resolve to the isolated HEE restore database`);
  }

  return {
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    database,
    // Prisma Postgres creates a distinct direct credential per provisioned
    // database. Its URL pathname may be empty or "postgres", so use the
    // credential principal (not the path) to reject accidental source=restore.
    identity: prismaDirect
      ? `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}/${decodeURIComponent(parsed.username)}`
      : `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}/${database}`,
  };
}

const [sourceName = "DATABASE_URL", restoreName] = process.argv.slice(2);
await resolveProductionDatabaseFromVercel(sourceName, restoreName);
canonicalizeManagedHeeDatabases(sourceName, restoreName);
canonicalizePrismaPostgresDirectUrls(sourceName, restoreName);
const source = parseDatabaseUrl(sourceName, "source");

if (restoreName) {
  const restore = parseDatabaseUrl(restoreName, "restore");
  const sourceIdentity = source.identity;
  const restoreIdentity = restore.identity;
  if (sourceIdentity === restoreIdentity) fail(`${sourceName} and ${restoreName} resolve to the same PostgreSQL database identity`);
}

console.log(`production-database-safety: PASS (${restoreName ? "source + isolated restore" : "source"}; sslmode=verify-full)`);
