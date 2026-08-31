import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("inbox reply queue and worker both reject disabled Meta connections", () => {
  const queue = readFileSync(new URL("../app/lib/whatsapp/reply-queue.ts", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../app/lib/whatsapp/reply-worker.ts", import.meta.url), "utf8");

  assert.match(queue, /status: "connected", disabledAt: null/);
  assert.match(worker, /disabledAt: true/);
  assert.match(worker, /context\.connection\.disabledAt/);
  assert.match(worker, /CONNECTION_NOT_READY/);
});
