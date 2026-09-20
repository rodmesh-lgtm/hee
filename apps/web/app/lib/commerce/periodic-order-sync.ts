import "server-only";

import { db } from "../db";
import { syncShopifyBookingOrders } from "./shopify-order-sync";
import { syncSallaBookingOrders } from "./salla-order-sync";
import { syncWooCommerceBookingOrders } from "./woocommerce-commerce";

const PROVIDERS = ["woocommerce", "salla", "shopify"] as const;
type SyncProvider = (typeof PROVIDERS)[number];

const SYNC_INTERVAL_MS: Record<SyncProvider, number> = {
  woocommerce: 10 * 60 * 1_000,
  salla: 6 * 60 * 60 * 1_000,
  shopify: 6 * 60 * 60 * 1_000,
};

function boundedBatch(env: NodeJS.ProcessEnv) {
  const requested = Number(env.COMMERCE_PERIODIC_SYNC_BATCH_SIZE ?? 2);
  return Number.isInteger(requested) && requested > 0 ? Math.min(requested, 5) : 2;
}

async function syncIntegration(provider: SyncProvider, businessId: string, integrationId: string) {
  const input = { businessId, integrationId, maxPages: provider === "woocommerce" ? 3 : 2 };
  if (provider === "woocommerce") return syncWooCommerceBookingOrders(input);
  if (provider === "salla") return syncSallaBookingOrders(input);
  return syncShopifyBookingOrders(input);
}

export async function runPeriodicCommerceOrderSync(input: { env?: NodeJS.ProcessEnv; now?: Date } = {}) {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const retryCutoff = new Date(now.getTime() - 5 * 60 * 1_000);
  const batchSize = boundedBatch(env);
  let attempted = 0;
  let succeeded = 0;
  let failed = 0;

  for (const provider of PROVIDERS) {
    const dueBefore = new Date(now.getTime() - SYNC_INTERVAL_MS[provider]);
    const integrations = await db.whatsAppCommerceIntegration.findMany({
      where: {
        provider,
        status: "active",
        updatedAt: { lte: retryCutoff },
        OR: [{ lastWebhookAt: null }, { lastWebhookAt: { lte: dueBefore } }],
      },
      orderBy: [{ lastWebhookAt: "asc" }, { connectedAt: "asc" }],
      take: batchSize,
      select: { id: true, businessId: true },
    });
    for (const integration of integrations) {
      attempted += 1;
      try {
        await syncIntegration(provider, integration.businessId, integration.id);
        succeeded += 1;
      } catch {
        failed += 1;
        await db.whatsAppCommerceIntegration.updateMany({
          where: { id: integration.id, businessId: integration.businessId, status: "active" },
          data: { lastErrorCode: `${provider.toUpperCase()}_ORDER_SYNC_FAILED` },
        }).catch(() => undefined);
      }
    }
  }
  return { attempted, succeeded, failed };
}
