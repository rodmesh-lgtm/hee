// Run: node --conditions=react-server --import tsx --test tests/salla-uninstall.integration.ts
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, type PrismaClient } from "@prisma/client";
import { applySallaUninstall } from "../app/lib/commerce/salla-uninstall";
import { sallaSubscriptionSummary } from "../app/lib/commerce/salla-subscription-read";
const now = new Date("2026-10-26T10:00:00Z");
const input = { businessId: "business-a", integrationId: "integration-a", merchantId: "123", eventId: "event-a", appId: "1849074620", uninstalledAt: now, now };

function fixture(connectedAt = new Date("2026-10-26T09:00:00Z"), missing = false) {
  const state = { status: "active", events: new Map<string, Record<string, unknown>>(), writes: [] as Array<{ model: string; where: Record<string, unknown>; data: Record<string, unknown> }>, audits: 0 };
  const mutate = (model: string) => async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    assert.equal(where.businessId, input.businessId);
    if (model !== "integration") assert.equal(where.integrationId, input.integrationId);
    else { assert.equal(where.id, input.integrationId); assert.equal(where.provider, "salla"); assert.equal(where.status, "active"); assert.equal(data.credentialEnvelope, Prisma.DbNull); state.status = String(data.status); }
    state.writes.push({ model, where, data }); return { count: 1 };
  };
  const database = { $transaction: async (operation: (tx: unknown) => Promise<unknown>) => operation({
    $queryRaw: async (sql: { values: unknown[] }) => {
      assert.ok(sql.values.includes(input.businessId)); assert.ok(sql.values.includes(input.integrationId)); assert.ok(sql.values.includes(input.merchantId));
      return missing ? [] : [{ status: state.status, connectedAt }];
    },
    whatsAppCommerceIntegration: { updateMany: mutate("integration") },
    whatsAppCommerceOAuthSession: { updateMany: mutate("oauth") },
    commerceBookingEligibility: { updateMany: mutate("eligibility") },
    sallaWebhookEvent: {
      findUnique: async ({ where }: { where: { eventId: string } }) => state.events.get(where.eventId) ?? null,
      updateMany: mutate("inbox"),
      upsert: async ({ where, create, update }: { where: { eventId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const prior = state.events.get(where.eventId); state.events.set(where.eventId, prior ? { ...prior, ...update } : create);
      },
    },
    whatsAppAuditLog: { create: async () => { state.audits++; return { id: "audit" }; } },
  }) } as unknown as Pick<PrismaClient, "$transaction">;
  return { state, database };
}

test("verified uninstall atomically revokes credentials, sessions and eligibility once", async () => {
  const f = fixture();
  assert.deepEqual(await applySallaUninstall({ ...input, database: f.database }), { duplicate: false, stale: false, alreadyDisconnected: false });
  assert.equal(f.state.status, "disconnected");
  assert.deepEqual(f.state.writes.map(w => w.model), ["oauth", "integration", "eligibility", "inbox"]);
  assert.deepEqual(f.state.writes[0].where.status, { in: ["created", "exchanging"] });
  assert.equal(f.state.writes[2].data.eligible, false);
  assert.equal(f.state.events.get(input.eventId)?.status, "processed");
  assert.doesNotMatch(JSON.stringify(f.state.events.get(input.eventId)?.payload), /token|secret|credential/i);
  assert.deepEqual(await applySallaUninstall({ ...input, database: f.database }), { duplicate: true });
  assert.equal(f.state.writes.length, 4); assert.equal(f.state.audits, 1);
});

test("a delayed uninstall after reconnection records the stale event and preserves current access", async () => {
  const f = fixture(new Date(now.getTime() + 1000));
  const result = await applySallaUninstall({ ...input, database: f.database });
  assert.equal(result.stale, true); assert.equal(f.state.status, "active"); assert.equal(f.state.writes.length, 0);
  assert.equal(f.state.events.get(input.eventId)?.lastErrorCode, "SALLA_UNINSTALL_STALE");
  assert.equal((await applySallaUninstall({ ...input, database: f.database })).duplicate, true);
});

test("missing tenant/store identity cannot revoke an integration", async () => {
  const f = fixture(undefined, true);
  await assert.rejects(applySallaUninstall({ ...input, database: f.database }), /SALLA_INTEGRATION_UNAVAILABLE/);
  assert.equal(f.state.writes.length, 0); assert.equal(f.state.events.size, 0); assert.equal(f.state.audits, 0);
});

test("subscription diagnostics expose only the allowlisted plan fields", () => {
  const result = sallaSubscriptionSummary([{ id: "123", item_type: "plan", plan_name: "INFRO", price: 99,
    access_token: "private-access", refresh_token: "private-refresh", customer: { email: "private-customer" }, settings: "private-settings" }]);
  assert.equal(result[0].price, 99);
  assert.equal(result[0].planName, "INFRO");
  assert.doesNotMatch(JSON.stringify(result), /private-|access_token|refresh_token|customer|settings/);
});
