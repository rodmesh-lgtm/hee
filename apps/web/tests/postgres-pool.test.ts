import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool, type PoolClient } from "pg";
import { PostgresPool } from "../lib/postgres-pool";

test("retries a failed connection before returning the checked-out client", async (t) => {
  const client = {} as PoolClient;
  const acquire = t.mock.method(Pool.prototype, "connect", (callback) => {
    if (acquire.mock.callCount() === 0) {
      callback(new Error("Connection terminated due to connection timeout"), undefined, () => {});
    } else {
      callback(undefined, client, () => {});
    }
  });

  assert.equal(await new PostgresPool().connect(), client);
  assert.equal(acquire.mock.callCount(), 2);
});

test("a pool query runs only once after a recovered checkout", async (t) => {
  const pool = new PostgresPool();
  const runQuery = t.mock.fn();
  const result = { rows: [{ id: 1 }] };
  const release = t.mock.fn();
  const client = {
    once() {},
    removeListener() {},
    release,
    query(_text: string, _values: unknown, callback: (error: null, result: unknown) => void) {
      runQuery();
      callback(null, result);
    },
  } as unknown as PoolClient;
  const acquire = t.mock.method(Pool.prototype, "connect", (callback) => {
    if (acquire.mock.callCount() === 0) {
      callback(new Error("Connection terminated unexpectedly"), undefined, release);
    } else {
      callback(undefined, client, release);
    }
  });

  assert.equal(await pool.query("INSERT INTO example DEFAULT VALUES RETURNING id"), result);
  assert.equal(acquire.mock.callCount(), 2);
  assert.equal(runQuery.mock.callCount(), 1);
  assert.equal(release.mock.callCount(), 1);
});

test("a persistent connection failure is returned after two attempts", async (t) => {
  const failure = new Error("Connection terminated unexpectedly");
  const acquire = t.mock.method(Pool.prototype, "connect", (callback) => {
    callback(failure, undefined, () => {});
  });

  await assert.rejects(new PostgresPool().connect(), (error) => error === failure);
  assert.equal(acquire.mock.callCount(), 2);
});

test("does not retry a queue timeout while other requests are waiting", async (t) => {
  const pool = new PostgresPool();
  Object.defineProperty(pool, "waitingCount", { value: 1 });
  const failure = new Error("timeout exceeded when trying to connect");
  const acquire = t.mock.method(Pool.prototype, "connect", (callback) => {
    callback(failure, undefined, () => {});
  });

  await assert.rejects(pool.connect(), (error) => error === failure);
  assert.equal(acquire.mock.callCount(), 1);
});
