import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { connectProofDatabase } from "../scripts/production-proof-connection";

test("backup proof identifies endpoint and does not disclose provider messages", async () => {
  for (const role of ["source", "restore"] as const) {
    await assert.rejects(connectProofDatabase({connect: async () => {
      throw Object.assign(new Error("postgres://user:secret@private/database"), {code:"ECONNRESET"});
    }}, role), {message:`Backup proof ${role} connection failed (ECONNRESET); verification stopped before migration`});
  }
});
test("backup proof sanitizes unexpected codes and makes no automatic retry", async () => {
  let attempts = 0;
  await assert.rejects(connectProofDatabase({connect: async () => {
    attempts++;
    throw {code:"postgres://secret"};
  }}, "source"), /source connection failed \(UNAVAILABLE\)/);
  assert.equal(attempts,1);
});
test("backup proof accepts successful connection", async () => {
  await connectProofDatabase({connect: async () => undefined}, "restore");
});
test("restore comparison uses the canonical URLs already verified by the workflows", () => {
  for (const name of ["production-migrations.yml", "production-backup-proof.yml"]) {
    const workflow = readFileSync(`../../.github/workflows/${name}`, "utf8");
    assert.ok(workflow.includes('SOURCE_DATABASE_URL="$DATABASE_URL" npm run backup:production-proof'));
    assert.ok(!workflow.includes('SOURCE_DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}'));
  }
});
