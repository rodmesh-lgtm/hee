import assert from "node:assert/strict";
import test from "node:test";
import { operationalErrorCategory, operationalErrorCode } from "../app/lib/operational-error";

test("classifies the observed pg connection timeout through a Prisma cause", () => {
  assert.equal(operationalErrorCategory(new Error("adapter failed", { cause: new Error("Connection terminated due to connection timeout") })), "database_timeout");
  assert.equal(operationalErrorCategory(new Error("timeout exceeded when trying to connect")), "database_timeout");
  assert.equal(operationalErrorCategory({ code: "P2024" }), "database_timeout");
});

test("operational diagnostics expose bounded codes without SQL, credentials or customer payloads", () => {
  assert.equal(operationalErrorCode({code:"P2010",meta:{code:"42883",message:"private SQL"}}),"SQLSTATE_42883");
  assert.equal(operationalErrorCode(new Error("wrapper",{cause:{code:"P2028"}})),"P2028");
  assert.equal(operationalErrorCode(new Error("INFRO_REMINDER_WEBHOOK_BINDING_INVALID")),"INFRO_REMINDER_WEBHOOK_BINDING_INVALID");
  for(const error of [{code:"customer@example.com"},new Error("postgresql://user:secret@host/db"),{message:"phone +966500000000",meta:{code:"private SQL"}},null])assert.equal(operationalErrorCode(error),"UNCLASSIFIED");
  const cycle:{cause?:unknown}={};cycle.cause=cycle;assert.equal(operationalErrorCode(cycle),"UNCLASSIFIED");
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

test("recognizes the observed Prisma protocol disconnect without exposing its query", () => {
  const failure = { name: 'PrismaClientUnknownRequestError', message: 'Private query ConnectorError(PostgresError { code: "08P01", message: "server conn crashed?" })' };
  assert.equal(operationalErrorCategory(failure), 'database_connection');
  assert.equal(operationalErrorCode(failure), 'SQLSTATE_08P01');
  assert.equal(operationalErrorCategory({cause:failure}), 'database_connection');
  assert.equal(operationalErrorCategory({code:'08P01'}), 'database_connection');
  assert.equal(operationalErrorCategory({...failure, name:'Error'}), 'unknown');
  assert.equal(operationalErrorCategory({...failure, message:'Unrelated error 08P01'}), 'unknown');
  assert.equal(operationalErrorCategory({...failure, message:failure.message.replace('08P01','23505')}), 'unknown');
});
