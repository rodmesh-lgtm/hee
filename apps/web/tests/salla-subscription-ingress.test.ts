import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHmac, randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { Prisma } from "@prisma/client";
import { PGlite } from "@electric-sql/pglite";
import * as domain from "../app/lib/commerce/salla-domain";
import * as lifecycle from "../app/lib/commerce/salla-lifecycle-domain";
import * as receipts from "../app/lib/commerce/salla-subscription-receipt";
import { readBoundedText } from "../app/lib/request-body";

type Capture = typeof import("../app/lib/commerce/salla-subscription-inbox").captureSallaSubscriptionReceipt;
type Uninstall = typeof import("../app/lib/commerce/salla-uninstall").applySallaUninstall;
type Data = Record<string, unknown>;
const secret = "isolated-webhook-secret-not-production";
const connectedAt = new Date("2026-10-26T00:00:00Z");
const payload = { event: "app.subscription.started", merchant: 321, created_at: "2026-10-27T10:00:00Z", data: {
  id: 123, subscription_id: 456, item_type: "plan", plan_type: "recurring", plan_period: "1",
  start_date: "2026-10-27", end_date: "2026-11-27", features: [{ key: "users", quantity: 3 }],
  access_token: "PRIVATE_TOKEN", customer: { phone: "PRIVATE_PHONE" }, settings: { secret: "PRIVATE_SETTINGS" },
} };

async function loadModule<T>(path: string, dependencies: Record<string, unknown>) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: (id: string) => { assert.ok(id in dependencies, id); return dependencies[id]; }, Date, Error, Response, console });
  return exports as T;
}

async function fixture() {
  const pg = new PGlite();
  await pg.exec(`CREATE TABLE "Business" (id text PRIMARY KEY);
    CREATE TABLE "WhatsAppCommerceIntegration" (id text PRIMARY KEY,"businessId" text REFERENCES "Business"(id),provider text,"externalStoreId" text,status text,"connectedAt" timestamptz,UNIQUE(id,"businessId"));
    INSERT INTO "Business" VALUES ('a'),('b');
    INSERT INTO "WhatsAppCommerceIntegration" VALUES ('store-a','a','salla','321','active','2026-10-26T00:00:00Z'),('store-b','b','salla','654','active','2026-10-26T00:00:00Z');`);
  const migration = await readFile(new URL("../prisma/migrations/20260919173000_salla_booking_eligibility/migration.sql", import.meta.url), "utf8");
  const end = migration.indexOf('CREATE TABLE "CommerceBookingEligibility"');
  assert.ok(end > 0);
  await pg.exec(migration.slice(0, end));
  let lookups = 0, healthWrites = 0, scheduled = 0;
  type Sql = Pick<PGlite, "query">;
  function adapter(sql: Sql) {
    const create = async ({ data }: { data: Data }) => {
      await sql.query(`INSERT INTO "SallaWebhookEvent" (id,"businessId","integrationId","eventId","eventType","merchantId",payload,status,"lastErrorCode") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
        [data.id, data.businessId, data.integrationId, data.eventId, data.eventType, data.merchantId, JSON.stringify(data.payload), data.status, data.lastErrorCode ?? null]);
      return data;
    };
    return {
      $queryRaw: async (query: Prisma.Sql) => (await sql.query(query.text, query.values)).rows,
      sallaWebhookEvent: {
        create,
        findUnique: async ({ where }: { where: { eventId: string } }) => (await sql.query(`SELECT * FROM "SallaWebhookEvent" WHERE "eventId"=$1`, [where.eventId])).rows[0] ?? null,
        upsert: async ({ where, update, create: data }: { where: { eventId: string }; update: Data; create: Data }) => {
          const exists = (await sql.query(`SELECT id FROM "SallaWebhookEvent" WHERE "eventId"=$1`, [where.eventId])).rows.length;
          if (!exists) return create({ data });
          await sql.query(`UPDATE "SallaWebhookEvent" SET status=$1,"lastErrorCode"=$2,payload=$3::jsonb WHERE "eventId"=$4`, [update.status, update.lastErrorCode ?? null, JSON.stringify(update.payload), where.eventId]);
          return update;
        },
        updateMany: async ({ where, data }: { where: Data; data: Data }) => {
          const or = where.OR as Array<Data>;
          assert.deepEqual(JSON.parse(JSON.stringify(or)), [{ status: { in: ["pending", "retry_scheduled", "processing"] } }, { status: "ignored", lastErrorCode: "SALLA_SUBSCRIPTION_VERIFICATION_REQUIRED" }]);
          const rows = await sql.query(`UPDATE "SallaWebhookEvent" SET status=$1,"lastErrorCode"=$2 WHERE "businessId"=$3 AND "integrationId"=$4 AND "eventId"<>$5 AND (status IN ('pending','retry_scheduled','processing') OR (status='ignored' AND "lastErrorCode"='SALLA_SUBSCRIPTION_VERIFICATION_REQUIRED')) RETURNING id`,
            [data.status, data.lastErrorCode, where.businessId, where.integrationId, (where.eventId as { not: string }).not]);
          return { count: rows.rows.length };
        },
      },
      whatsAppCommerceIntegration: { updateMany: async ({ where }: { where: Data }) => {
        healthWrites++;
        return { count: (await sql.query(`UPDATE "WhatsAppCommerceIntegration" SET status='disconnected' WHERE id=$1 AND "businessId"=$2 AND status='active' RETURNING id`, [where.id, where.businessId])).rows.length };
      } },
      whatsAppCommerceOAuthSession: { updateMany: async () => ({ count: 0 }) },
      commerceBookingEligibility: { updateMany: async () => ({ count: 0 }) },
    };
  }
  const database = {
    ...adapter(pg),
    $transaction: async (operation: (tx: ReturnType<typeof adapter>) => Promise<unknown>) => pg.transaction(tx => operation(adapter(tx))),
    whatsAppCommerceIntegration: {
      ...adapter(pg).whatsAppCommerceIntegration,
      findFirst: async ({ where }: { where: { externalStoreId: string; status: unknown } }) => {
        lookups++;
        const rows = await pg.query(`SELECT id,"businessId","connectedAt" FROM "WhatsAppCommerceIntegration" WHERE provider='salla' AND "externalStoreId"=$1 AND (status='active' OR ($2 AND status='disconnected'))`, [where.externalStoreId, typeof where.status !== "string"]);
        return rows.rows[0] ?? null;
      },
    },
  };
  const capture = (await loadModule<{ captureSallaSubscriptionReceipt: Capture }>("../app/lib/commerce/salla-subscription-inbox.ts", {
    "server-only": {}, "node:crypto": { randomUUID }, "@prisma/client": { Prisma }, "../db": { db: database }, "./salla-subscription-receipt": receipts,
  })).captureSallaSubscriptionReceipt;
  const uninstall = (await loadModule<{ applySallaUninstall: Uninstall }>("../app/lib/commerce/salla-uninstall.ts", {
    "server-only": {}, "node:crypto": { randomUUID }, "@prisma/client": { Prisma }, "../db": { db: database },
    "../whatsapp/audit": { writeWhatsAppAuditLog: async () => undefined }, "./salla-lifecycle-domain": lifecycle,
  })).applySallaUninstall;
  const route = await loadModule<{ POST: (r: Request) => Promise<Response> }>("../app/api/commerce/salla/webhook/route.ts", {
    "node:crypto": { randomUUID }, "next/server": { NextResponse: Response, after: () => { scheduled++; } },
    "../../../../lib/db": { db: database }, "../../../../lib/request-body": { readBoundedText },
    "../../../../lib/commerce/salla-config": { getSallaConfig: () => ({ SALLA_APP_ID: "123", SALLA_WEBHOOK_SECRET: secret, SALLA_LEGACY_WEBHOOK_UTC_OFFSET: 180 }) },
    "../../../../lib/commerce/salla-subscription-receipt": receipts,
    "../../../../lib/commerce/salla-subscription-inbox": { captureSallaSubscriptionReceipt: capture },
    "../../../../lib/commerce/salla-webhook-storage": { sallaWebhookStoragePayload: () => { throw Error("Unexpected order storage"); } },
    "../../../../lib/commerce/salla-webhook-processor": { processNextSallaWebhookEvent: () => { throw Error("Unexpected order dispatch"); } },
    "../../../../lib/commerce/salla-uninstall": { applySallaUninstall: uninstall },
    "../../../../lib/commerce/salla-lifecycle-domain": lifecycle, "../../../../lib/commerce/salla-domain": domain,
  });
  const request = (value: unknown = payload, validSignature = true) => {
    const body = JSON.stringify(value);
    return new Request("https://ir.sa/api/commerce/salla/webhook", { method: "POST", headers: { "content-type": "application/json", "x-salla-signature": validSignature ? createHmac("sha256", secret).update(body).digest("hex") : "invalid" }, body });
  };
  const input = { businessId: "a", integrationId: "store-a", merchantId: "321", appId: "123", connectedAt, eventId: "receipt-a", receipt: receipts.sallaSubscriptionReceipt(payload, "123", "321", 180) };
  return { pg, capture, uninstall, route, request, input, counters: () => ({ lookups, healthWrites, scheduled }) };
}

test("signed subscription ingress obeys the real inbox constraint and excludes credentials, payments and order dispatch", async () => {
  const f = await fixture();
  try {
    await assert.rejects(f.pg.query(`INSERT INTO "SallaWebhookEvent" (id,"businessId","integrationId","eventId","eventType","merchantId",payload,status) VALUES ('bad','a','store-a','bad','app.trial.started','321','{}','pending_verification')`), /SallaWebhookEvent_status_check/);
    assert.equal((await f.route.POST(f.request(payload, false))).status, 401);
    assert.equal(f.counters().lookups, 0);
    assert.equal((await f.route.POST(f.request({ ...payload, data: { ...payload.data, id: 124 } }))).status, 400);
    assert.equal((await f.route.POST(f.request())).status, 200);
    assert.equal((await f.route.POST(f.request())).status, 200);
    const rows = await f.pg.query<{ status: string; lastErrorCode: string; payload: unknown }>(`SELECT status,"lastErrorCode",payload FROM "SallaWebhookEvent"`);
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].status, "ignored");
    assert.equal(rows.rows[0].lastErrorCode, "SALLA_SUBSCRIPTION_VERIFICATION_REQUIRED");
    assert.doesNotMatch(JSON.stringify(rows.rows[0].payload), /PRIVATE_|access_token|customer|settings/);
    assert.equal(f.counters().healthWrites, 0);
    assert.equal(f.counters().scheduled, 0);
  } finally { await f.pg.close(); }
});

test("receipt storage rejects foreign tenants and replaced or revoked connection generations", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.capture({ ...f.input, businessId: "b" })).kind, "disconnected");
    await f.pg.query(`UPDATE "WhatsAppCommerceIntegration" SET "connectedAt"='2026-10-28T00:00:00Z' WHERE id='store-a'`);
    assert.equal((await f.capture(f.input)).kind, "replaced");
    await f.pg.query(`UPDATE "WhatsAppCommerceIntegration" SET status='disconnected' WHERE id='store-a'`);
    assert.equal((await f.capture(f.input)).kind, "disconnected");
    assert.equal((await f.pg.query(`SELECT id FROM "SallaWebhookEvent"`)).rows.length, 0);
  } finally { await f.pg.close(); }
});

test("a second store cannot overwrite another tenant's subscription event identity", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.capture(f.input)).kind, "stored");
    const receipt = receipts.sallaSubscriptionReceipt({ ...payload, merchant: 654 }, "123", "654", 180);
    assert.equal((await f.capture({ ...f.input, businessId: "b", integrationId: "store-b", merchantId: "654", receipt })).kind, "conflict");
    const rows = await f.pg.query<{ businessId: string; integrationId: string }>(`SELECT "businessId","integrationId" FROM "SallaWebhookEvent"`);
    assert.deepEqual(rows.rows, [{ businessId: "a", integrationId: "store-a" }]);
  } finally { await f.pg.close(); }
});

test("verified uninstall invalidates quarantined receipts and reinstall cannot resurrect the old receipt", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.capture(f.input)).kind, "stored");
    await f.uninstall({ businessId: "a", integrationId: "store-a", merchantId: "321", appId: "123", eventId: "uninstall-a", uninstalledAt: new Date("2026-10-27T12:00:00Z") });
    const [saved] = (await f.pg.query<{ status: string; lastErrorCode: string }>(`SELECT status,"lastErrorCode" FROM "SallaWebhookEvent" WHERE "eventId"='receipt-a'`)).rows;
    assert.equal(saved.status, "ignored"); assert.equal(saved.lastErrorCode, "SALLA_APP_UNINSTALLED");
    assert.equal((await f.capture(f.input)).kind, "disconnected");
    await f.pg.query(`UPDATE "WhatsAppCommerceIntegration" SET status='active',"connectedAt"='2026-10-28T00:00:00Z' WHERE id='store-a'`);
    assert.equal((await f.capture({ ...f.input, connectedAt: new Date("2026-10-28T00:00:00Z") })).kind, "duplicate");
    assert.equal((await f.pg.query<{ lastErrorCode: string }>(`SELECT "lastErrorCode" FROM "SallaWebhookEvent" WHERE "eventId"='receipt-a'`)).rows[0].lastErrorCode, "SALLA_APP_UNINSTALLED");
  } finally { await f.pg.close(); }
});
