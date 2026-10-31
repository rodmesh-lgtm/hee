// Run: node --conditions=react-server --import tsx --test tests/salla-sync-revocation.integration.ts
import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { syncSallaBookingOrders } from "../app/lib/commerce/salla-order-sync";
import { disconnectWhatsAppCommerceIntegration } from "../app/lib/whatsapp/commerce-integrations";
import { processSallaWebhookEvent } from "../app/lib/commerce/salla-webhook-processor";

const input = { businessId: "review-business", integrationId: "2cae72ce-7615-4e71-a276-29c226bb67cf" };
const connectedAt = new Date("2026-10-26T08:00:00Z");
const order = { id: 123, payment_status: "paid", status: { slug: "under_review" }, customer: { mobile: "0500000001" }, updated_at: "2026-10-26T08:10:00Z" };

function fixture(change?: "disconnect" | "reconnect" | "before_request" | "network_after_reconnect", options: { order?: object; current?: { providerUpdatedAt: Date; updatedAt: Date } } = {}) {
  let status = "active";
  let currentDate = connectedAt;
  let writes = 0;
  let audits = 0;
  let requests = 0;
  let healthWrites = 0;
  const matches = (where: Record<string, unknown>) => where.id === input.integrationId && where.businessId === input.businessId
    && where.provider === "salla" && where.status === status && (!where.connectedAt || where.connectedAt === currentDate);
  const integration = {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => matches(where) ? { id: input.integrationId, credentialEnvelope: {}, connectedAt: currentDate, externalStoreId: "123456" } : null,
    updateMany: async ({ where }: { where: Record<string, unknown> }) => { if (!matches(where)) return { count: 0 }; healthWrites++; return { count: 1 }; },
  };
  const database = {
    whatsAppCommerceIntegration: integration,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      let locked = false;
      return fn({
        $queryRaw: async (sql: { strings: string[]; values: unknown[] }) => {
          assert.match(sql.strings.join("?"), /FOR UPDATE/);
          for (const value of [input.integrationId, input.businessId, connectedAt, "123456"]) assert.ok(sql.values.includes(value));
          locked = status === "active" && currentDate === connectedAt;
          return locked ? [{ id: input.integrationId }] : [];
        },
        whatsAppCommerceIntegration: integration,
        commerceBookingEligibility: {
          findUnique: async () => options.current ?? null,
          upsert: async ({ create }: { create: { businessId: string; integrationId: string; eligible: boolean } }) => {
            assert.ok(locked); assert.equal(create.businessId, input.businessId); assert.equal(create.integrationId, input.integrationId);
            assert.equal(create.eligible, true); writes++; return {};
          },
        },
        whatsAppAuditLog: { create: async () => { assert.ok(locked); audits++; return { id: "audit" }; } },
      });
    },
  } as unknown as PrismaClient;
  const loadToken = async () => { if (change === "before_request") status = "disconnected"; return "test-token"; };
  const fetcher = (async () => {
    requests++;
    if (change === "disconnect") status = "disconnected";
    if (change === "reconnect" || change === "network_after_reconnect") currentDate = new Date("2026-10-26T08:30:00Z");
    if (change === "network_after_reconnect") throw new Error("NETWORK_FAILURE");
    return Response.json({ data: [options.order ?? order], pagination: { totalPages: 1 } });
  }) as typeof fetch;
  return { run: () => syncSallaBookingOrders(input, { database, fetcher, loadToken }), counts: () => ({ writes, audits, requests, healthWrites }) };
}

test("an unchanged Salla authorization imports paid orders and records success", async () => {
  const f = fixture();
  assert.deepEqual(await f.run(), { imported: 1, pages: 1 });
  assert.deepEqual(f.counts(), { writes: 1, audits: 1, requests: 1, healthWrites: 1 });
});

test("disconnect or reconnect during an order request prevents old writes and new-connection health changes", async () => {
  for (const change of ["disconnect", "reconnect"] as const) {
    const f = fixture(change);
    await assert.rejects(f.run(), /SALLA_CONNECTION_CHANGED/);
    assert.deepEqual(f.counts(), { writes: 0, audits: 0, requests: 1, healthWrites: 0 });
  }
});

test("revocation before the HTTP request prevents credential transmission", async () => {
  const f = fixture("before_request");
  await assert.rejects(f.run(), /SALLA_CONNECTION_CHANGED/);
  assert.deepEqual(f.counts(), { writes: 0, audits: 0, requests: 0, healthWrites: 0 });
});

test("a failed old request cannot mark a replacement connection unhealthy", async () => {
  const f = fixture("network_after_reconnect");
  await assert.rejects(f.run(), /NETWORK_FAILURE/);
  assert.deepEqual(f.counts(), { writes: 0, audits: 0, requests: 1, healthWrites: 0 });
});

test("manual Salla disconnect invalidates only that tenant's old booking eligibility, including on replay", async () => {
  for (const status of ["active", "disconnected"]) {
    let invalidated = false;
    const database = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      $queryRaw: async () => [{ id: input.integrationId, provider: "salla", status }],
      whatsAppCommerceOAuthSession: { updateMany: async () => ({ count: 0 }) },
      whatsAppShopifyWebhookSync: { updateMany: async () => ({ count: 0 }) },
      whatsAppCommerceIntegration: { updateMany: async () => ({ count: 1 }) },
      commerceBookingEligibility: { updateMany: async (args: unknown) => {
        assert.deepEqual(args, { where: { ...input, provider: "salla" }, data: { eligible: false } });
        invalidated = true; return { count: 1 };
      } },
      whatsAppAuditLog: { create: async () => ({ id: "audit" }) },
    }) } as unknown as PrismaClient;
    await disconnectWhatsAppCommerceIntegration({ ...input, actorUserId: "owner", database });
    assert.equal(invalidated, true);
  }
});

test("an old webhook checks the locked connection before it can update order eligibility", async () => {
  for (const uninstallCompleted of [false, true]) {
    let locked = false;
    let status = "processing";
    const event = { id: "inbox-event", ...input, merchantId: "123456", receivedAt: new Date("2026-10-26T08:15:00Z"),
      payload: { event: "order.updated", data: order }, integration: { businessId: input.businessId, provider: "salla", status: "active", externalStoreId: "123456" } };
    const database = {
      sallaWebhookEvent: {
        findFirst: async () => event,
        findUnique: async () => ({ attemptCount: 1 }),
        updateMany: async () => { assert.equal(status, "ignored"); return { count: 0 }; },
      },
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
        $queryRaw: async (sql: { strings: string[]; values: unknown[] }) => {
          assert.match(sql.strings.join("?"), /FOR UPDATE/);
          for (const value of [input.businessId, input.integrationId, event.merchantId, event.receivedAt]) assert.ok(sql.values.includes(value));
          locked = true;
          if (uninstallCompleted) status = "ignored";
          return [];
        },
        sallaWebhookEvent: {
          findFirst: async () => { assert.ok(locked); return status === "processing" ? { id: event.id } : null; },
          update: async ({ data }: { data: { status: string; lastErrorCode: string } }) => {
            assert.equal(data.lastErrorCode, "SALLA_PREVIOUS_CONNECTION_EVENT"); status = data.status;
          },
        },
        commerceBookingEligibility: { upsert: async () => { throw new Error("STALE_ORDER_WRITE"); } },
      }),
    } as unknown as PrismaClient;
    const result = await processSallaWebhookEvent({ eventId: event.id, workerId: "worker", database });
    assert.equal(status, "ignored");
    assert.equal(result.processed, !uninstallCompleted);
  }
});


test("fresh API snapshot without updated_at is not discarded because its creation date precedes a webhook", async () => {
  const f = fixture(undefined, { order: { ...order, updated_at: undefined, date: "2026-10-25T08:00:00Z" },
    current: { providerUpdatedAt: new Date("2026-10-26T08:10:00Z"), updatedAt: new Date("2026-10-26T08:11:00Z") } });
  assert.deepEqual(await f.run(), { imported: 1, pages: 1 });
  assert.equal(f.counts().writes, 1);
});

test("sync preserves genuinely newer provider revisions and concurrent local commits", async () => {
  for (const current of [
    { providerUpdatedAt: new Date("2026-10-26T09:00:00Z"), updatedAt: new Date("2026-10-26T09:01:00Z") },
    { providerUpdatedAt: new Date("2026-10-26T08:00:00Z"), updatedAt: new Date("2099-01-01T00:00:00Z") },
  ]) {
    const f = fixture(undefined, { current });
    assert.deepEqual(await f.run(), { imported: 0, pages: 1 });
    assert.equal(f.counts().writes, 0);
  }
});
