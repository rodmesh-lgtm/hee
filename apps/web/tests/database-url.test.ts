import assert from "node:assert/strict";
import test from "node:test";
import { normalizePostgresDatabaseUrl, normalizePostgresRuntimeUrl } from "../lib/database-url";

test("preserves explicit verify-full PostgreSQL connections", () => {
  const normalized = normalizePostgresDatabaseUrl("postgresql://user:pass@db.example.com:5432/hee?sslmode=verify-full");
  assert.equal(new URL(normalized).searchParams.get("sslmode"), "verify-full");
});

test("keeps the current strict TLS semantics explicit for legacy sslmode values", () => {
  for (const mode of ["prefer", "require", "verify-ca"]) {
    const normalized = normalizePostgresDatabaseUrl(`postgresql://user:pass@db.example.com:5432/hee?sslmode=${mode}`);
    assert.equal(new URL(normalized).searchParams.get("sslmode"), "verify-full");
  }
});

test("does not override an explicit disabled SSL mode", () => {
  const normalized = normalizePostgresDatabaseUrl("postgresql://user:pass@127.0.0.1:5432/hee?sslmode=disable");
  assert.equal(new URL(normalized).searchParams.get("sslmode"), "disable");
});

test("rejects non-PostgreSQL database URLs", () => {
  assert.throws(() => normalizePostgresDatabaseUrl("https://db.example.com/hee"), /PostgreSQL DATABASE_URL/);
  assert.throws(() => normalizePostgresDatabaseUrl("not-a-url"), /not a valid URL/);
});


test("runtime uses the official pooler without changing database identity or weakening TLS", () => {
  const source = "postgresql://user:encoded%40password@db.prisma.io:5432/postgres?sslmode=require&schema=public";
  const direct = new URL(normalizePostgresDatabaseUrl(source));
  const pooled = new URL(normalizePostgresRuntimeUrl(source));
  assert.equal(direct.hostname, "db.prisma.io");
  assert.equal(pooled.hostname, "pooled.db.prisma.io");
  for (const key of ["username", "password", "port", "pathname", "search"] as const) assert.equal(pooled[key], direct[key]);
  assert.equal(pooled.searchParams.get("sslmode"), "verify-full");
  assert.equal(new URL(source).hostname, "db.prisma.io");
});

test("runtime leaves other providers, custom ports, local databases and existing poolers unchanged", () => {
  for (const host of ["pooled.db.prisma.io:5432", "db.prisma.io:15432", "db.prisma.io.example.com:5432", "db.example.com:5432", "127.0.0.1:5432"]) {
    const source = `postgresql://user:pass@${host}/hee?sslmode=verify-full`;
    assert.equal(normalizePostgresRuntimeUrl(source), normalizePostgresDatabaseUrl(source));
  }
});

test("runtime rejects invalid protocols and duplicate SSL modes before routing", () => {
  assert.throws(() => normalizePostgresRuntimeUrl("https://db.prisma.io/postgres"), /PostgreSQL DATABASE_URL/);
  assert.throws(() => normalizePostgresRuntimeUrl("postgresql://user:pass@db.prisma.io/postgres?sslmode=verify-full&sslmode=disable"), /at most one sslmode/);
});
