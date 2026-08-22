#!/usr/bin/env node

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function fail(message) {
  console.error(`production-database-safety: FAIL ${message}`);
  process.exit(1);
}

function requiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) fail(`${name} is required`);
  return value;
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

  // Operational tooling (psql/pg_dump/pg_restore/Prisma CLI) consumes DATABASE_URL
  // directly and does not pass through the application's URL normalizer. Require the
  // strongest libpq mode here so maintenance traffic can never silently fall back to
  // plaintext or skip hostname verification. Reject duplicate sslmode parameters so
  // different parsers cannot disagree about which value controls the connection.
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

  return {
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    database,
  };
}

const [sourceName = "DATABASE_URL", restoreName] = process.argv.slice(2);
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
