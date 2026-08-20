import assert from "node:assert/strict";
import test from "node:test";
import { normalizePostgresDatabaseUrl } from "../lib/database-url";

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
