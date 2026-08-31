import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign preflight and queue insertion share a serializable transaction", () => {
  const queue = readFileSync(new URL("../app/lib/whatsapp/delivery-queue.ts", import.meta.url), "utf8");
  assert.match(queue, /database\.\$transaction/);
  assert.match(queue, /Prisma\.TransactionIsolationLevel\.Serializable/);
});
