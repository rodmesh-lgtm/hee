import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("Vercel Salla stage retries welcome mail only when enabled, bounds work and still processes events", async () => {
  const source = readFileSync(new URL("../app/lib/whatsapp/vercel-operations-runner.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const mode of ["disabled", "empty", "backlog"]) {
    let mail = 0, events = 0;
    const exports: Record<string, unknown> = {};
    runInNewContext(code, { exports, console, require: (name: string) => {
      if (name === "node:crypto") return { randomUUID: () => "test" };
      if (name === "../commerce/salla-welcome") return { sendNextSallaWelcome: async () => { mail++; return { processed: mode === "backlog" }; } };
      if (name === "../commerce/salla-webhook-processor") return { processNextSallaWebhookEvent: async () => { events++; return { processed: false }; } };
      return {};
    } });
    await (exports.runVercelWhatsAppStage as (stage: string, env: object) => Promise<void>)("whatsapp:salla-webhooks", { SALLA_EASY_MODE_ENABLED: mode === "disabled" ? "false" : "true" });
    assert.equal(mail, mode === "disabled" ? 0 : mode === "empty" ? 1 : 10);
    assert.equal(events, 1);
  }
});
