import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { commerceBookingGate } from "../app/lib/commerce/booking-eligibility";

test("each business uses its own audience and order; another business's matching phone cannot unlock booking", async () => {
  const policies: Record<string, string> = { public: "everyone", restricted: "store_orders", other: "store_orders" };
  let orderQueries = 0;
  const database = {
    business: { findFirst: async ({ where }: { where: { id: string } }) => policies[where.id]
      ? { pageModules: [{ id: "contact", config: { bookingAudience: policies[where.id] } }] } : null },
    whatsAppCommerceIntegration: { findFirst: async ({ where }: { where: { businessId: string; status: string } }) => {
      assert.equal(where.status, "active"); return where.businessId === "restricted" || where.businessId === "other" ? { id: where.businessId } : null;
    } },
    commerceBookingEligibility: { findFirst: async ({ where }: { where: { businessId: string; phoneE164: string; eligible: boolean; integration: { businessId: string; status: string } } }) => {
      orderQueries++;
      assert.equal(where.integration.businessId, where.businessId);
      assert.equal(where.integration.status, "active");
      assert.equal(where.eligible, true);
      return where.businessId === "other" && where.phoneE164 === "+966500000001" ? { id: "owned-order" } : null;
    } },
  } as unknown as PrismaClient;
  const gate = (businessId: string) => commerceBookingGate({ businessId, phoneE164: "+966500000001", database });
  assert.deepEqual(await gate("public"), { required: false, eligible: true });
  assert.equal(orderQueries, 0);
  assert.deepEqual(await gate("restricted"), { required: true, eligible: false });
  assert.deepEqual(await gate("other"), { required: true, eligible: true });
  assert.deepEqual(await gate("missing"), { required: true, eligible: false });
  policies.public = "store_orders";
  assert.deepEqual(await gate("public"), { required: true, eligible: false });
});
