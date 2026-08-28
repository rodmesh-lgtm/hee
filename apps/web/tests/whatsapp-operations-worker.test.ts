import assert from "node:assert/strict";
import test from "node:test";

import {
  WHATSAPP_OPERATION_STAGES,
  runWhatsAppOperations,
} from "../app/lib/whatsapp/operations-worker";

function databaseDouble() {
  const writes: Array<{ method: string; value: unknown }> = [];
  return {
    writes,
    database: {
      whatsAppOperationsHeartbeat: {
        async upsert(value: unknown) { writes.push({ method: "upsert", value }); },
        async update(value: unknown) { writes.push({ method: "update", value }); },
      },
    },
  };
}

test("operations worker stays fail-closed until explicitly enabled", async () => {
  const state = databaseDouble();
  const result = await runWhatsAppOperations({
    database: state.database as never,
    env: { NODE_ENV: "production", RELEASE_SHA: "bad" },
    runStage: async () => assert.fail("disabled worker must not run stages"),
  });
  assert.deepEqual(result, { enabled: false, completedStages: [] });
  assert.equal(state.writes.length, 0);
});

test("enabled production worker requires exact release provenance", async () => {
  const state = databaseDouble();
  await assert.rejects(
    runWhatsAppOperations({
      database: state.database as never,
      env: { NODE_ENV: "production", WHATSAPP_MARKETING_WORKER_ENABLED: "true" },
    }),
    /WHATSAPP_RELEASE_SHA_REQUIRED/,
  );
  assert.equal(state.writes.length, 0);
});

test("successful cycle runs every durable stage and records an exact-SHA heartbeat", async () => {
  const state = databaseDouble();
  const stages: string[] = [];
  const times = [new Date("2026-08-28T15:00:00Z"), new Date("2026-08-28T15:00:03Z")];
  const sha = "a".repeat(40);
  const result = await runWhatsAppOperations({
    database: state.database as never,
    env: { NODE_ENV: "production", WHATSAPP_MARKETING_WORKER_ENABLED: "true", RELEASE_SHA: sha },
    now: () => times.shift()!,
    runStage: async (stage) => { stages.push(stage); },
  });
  assert.deepEqual(stages, WHATSAPP_OPERATION_STAGES);
  assert.equal(result.releaseSha, sha);
  assert.equal(state.writes.length, 2);
  assert.match(JSON.stringify(state.writes[1]), /lastSucceededAt/);
  assert.match(JSON.stringify(state.writes[1]), /succeeded/);
});

test("failed stage records only a bounded error code without starving independent queues", async () => {
  const state = databaseDouble();
  const stages: string[] = [];
  await assert.rejects(
    runWhatsAppOperations({
      database: state.database as never,
      env: { NODE_ENV: "test", WHATSAPP_MARKETING_WORKER_ENABLED: "true" },
      now: () => new Date("2026-08-28T15:00:00Z"),
      runStage: async (stage) => {
        stages.push(stage);
        if (stage === "whatsapp:campaigns") throw new Error("secret provider response");
      },
    }),
    /WHATSAPP_CAMPAIGNS_FAILED/,
  );
  assert.deepEqual(stages, WHATSAPP_OPERATION_STAGES);
  const failure = JSON.stringify(state.writes.at(-1));
  assert.match(failure, /WHATSAPP_CAMPAIGNS_FAILED/);
  assert.doesNotMatch(failure, /secret provider response/);
});
