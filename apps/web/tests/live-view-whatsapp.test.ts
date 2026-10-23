import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { liveViewRecipientPhone } from "../app/lib/live-view/whatsapp-domain";

test("viewing recipients accept Saudi local, international and Arabic digit forms", () => {
  for (const value of ["0501234567", "966501234567", "+966501234567", "00966501234567", "٠٥٠١٢٣٤٥٦٧"]) assert.equal(liveViewRecipientPhone(value), "+966501234567");
  assert.equal(liveViewRecipientPhone("bad-number"), null);
});
test("server WhatsApp integration: isolation, live capability, consent, duplicate and uncertain delivery controls", () => {
  const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--test", fileURLToPath(new URL("./fixtures/live-view-whatsapp-runner.ts", import.meta.url))], { encoding: "utf8", timeout: 30000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
