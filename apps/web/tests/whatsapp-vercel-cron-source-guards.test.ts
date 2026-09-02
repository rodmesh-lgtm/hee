import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Vercel invokes the authenticated WhatsApp operations route every five minutes", () => {
  const config = JSON.parse(source("vercel.json"));
  assert.deepEqual(config.crons, [{
    path: "/api/cron/whatsapp-operations",
    schedule: "*/5 * * * *",
  }]);

  const route = source("app/api/cron/whatsapp-operations/route.ts");
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function POST/);
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /export const maxDuration = 300/);
  assert.match(route, /WHATSAPP_MARKETING_WORKER_ENABLED !== "true"/);
  assert.match(route, /state.*leased/);
  assert.match(route, /INTERVAL '10 minutes'/);
  assert.match(route, /VERCEL_GIT_COMMIT_SHA/);
});

test("serverless stages run in-process without spawning npm or a shell", () => {
  const runner = source("app/lib/whatsapp/vercel-operations-runner.ts");
  assert.match(runner, /runVercelWhatsAppStage/);
  assert.match(runner, /processNextWhatsAppDelivery/);
  assert.match(runner, /processNextWhatsAppWebhookEvent/);
  assert.doesNotMatch(runner, /node:child_process/);
  assert.doesNotMatch(runner, /spawn\(/);
  assert.doesNotMatch(runner, /npm run/);
  assert.doesNotMatch(runner, /console\.(log|error)/);
});

test("cron credentials and outbound switches are synchronized and exact-SHA attested", () => {
  const sync = source("../../.github/scripts/sync-vercel-production-env.mjs");
  const presence = source("../../.github/scripts/production-config-presence-audit.mjs");
  const attestation = source("../../.github/scripts/production-config-attestation.mjs");
  for (const name of ["CRON_SECRET", "WHATSAPP_MARKETING_WORKER_ENABLED", "WHATSAPP_OUTBOUND_ENABLED"]) {
    assert.match(sync, new RegExp(`required\\(\\"${name}\\"\\)`));
    assert.match(presence, new RegExp(`'${name}'`));
    assert.match(attestation, new RegExp(`\\"${name}\\"`));
  }

  for (const workflow of [
    "production-preflight-v2.yml",
    "production-deploy.yml",
    "production-enter-maintenance.yml",
    "production-billing-rehearsal.yml",
    "production-open-paid-checkout.yml",
  ]) {
    const body = source(`../../.github/workflows/${workflow}`);
    assert.match(body, /CRON_SECRET: \$\{\{ secrets\.PRODUCTION_CRON_SECRET \}\}/);
    assert.match(body, /WHATSAPP_MARKETING_WORKER_ENABLED: \$\{\{ vars\.PRODUCTION_WHATSAPP_MARKETING_WORKER_ENABLED \}\}/);
    assert.match(body, /WHATSAPP_OUTBOUND_ENABLED: \$\{\{ vars\.PRODUCTION_WHATSAPP_OUTBOUND_ENABLED \}\}/);
  }
});
