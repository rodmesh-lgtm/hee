import assert from "node:assert/strict";
import test from "node:test";
import { operationalErrorCategory } from "../app/lib/operational-error";

test("classifies the observed pg connection timeout through a Prisma cause", () => {
  assert.equal(operationalErrorCategory(new Error("adapter failed", { cause: new Error("Connection terminated due to connection timeout") })), "database_timeout");
  assert.equal(operationalErrorCategory(new Error("timeout exceeded when trying to connect")), "database_timeout");
  assert.equal(operationalErrorCategory({ code: "P2024" }), "database_timeout");
});
test("distinguishes a disconnected database from schema and unknown provider failures", () => {
  assert.equal(operationalErrorCategory({ cause: { code: "ECONNRESET" } }), "database_connection");
  assert.equal(operationalErrorCategory({ code: "42P01" }), "database_schema");
  assert.equal(operationalErrorCategory({ code: 131042, message: "private provider payload" }), "unknown");
  assert.equal(operationalErrorCategory(new Error("postgresql://user:secret@host/database")), "unknown");
});
test("terminates on cyclic causes and non-error thrown values", () => {
  const error: {cause?:unknown} = {}; error.cause = error;
  assert.equal(operationalErrorCategory(error), "unknown");
  for (const value of [null, undefined, "ETIMEDOUT", 503]) assert.equal(operationalErrorCategory(value), "unknown");
});
