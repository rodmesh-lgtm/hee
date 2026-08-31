import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign launch preflight pins both connection and template to Meta", () => {
  const queue = readFileSync(new URL("../app/lib/whatsapp/delivery-queue.ts", import.meta.url), "utf8");
  assert.ok((queue.match(/provider: "meta"/g) ?? []).length >= 2);
});
