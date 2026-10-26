import "server-only";
import { db } from "../db";
import { getSallaAccessToken } from "./salla-access-token";
import { getSallaConfig } from "./salla-config";

export class SallaSubscriptionReadError extends Error {
  constructor(code: string, readonly providerStatus: number, readonly dataShape?: string) { super(code); }
}

/** Authoritative read only: this does not create an INFRO term or a payment. */
export async function readSallaSubscription(input: { businessId: string; integrationId: string }) {
  const integration = await db.whatsAppCommerceIntegration.findFirst({
    where: { id: input.integrationId, businessId: input.businessId, provider: "salla", status: "active" },
    select: { id: true, externalStoreId: true, connectedAt: true },
  });
  if (!integration) throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
  const config = getSallaConfig();
  let token = await getSallaAccessToken(input);
  const request = () => fetch(`https://api.salla.dev/admin/v2/apps/${config.SALLA_APP_ID}/subscriptions`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
  });
  let response = await request();
  if (response.status === 401) {
    await response.body?.cancel();
    token = await getSallaAccessToken({ ...input, rejectedAccessToken: token });
    response = await request();
  }
  if (!response.ok) throw new SallaSubscriptionReadError(`SALLA_SUBSCRIPTION_HTTP_${response.status}`, response.status);
  const result = await response.json().catch(() => null) as { success?: unknown; data?: unknown } | null;
  if (result?.success !== true || !Array.isArray(result.data) || result.data.length > 100) {
    const shape = result?.data == null ? "missing" : Array.isArray(result.data) ? "array" : typeof result.data;
    throw new SallaSubscriptionReadError("SALLA_SUBSCRIPTION_RESPONSE_INVALID", response.status, shape);
  }
  return { integration, subscriptions: result.data as unknown[], fetchedAt: new Date() };
}

/** An explicit allowlist keeps provider/customer metadata out of the browser. */
export function sallaSubscriptionSummary(items: unknown[]) {
  const scalar = (v: unknown) => typeof v === "string" ? v.slice(0, 160) : typeof v === "number" && Number.isFinite(v) ? v : null;
  return items.map(value => {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    return { id: scalar(row.id), itemType: scalar(row.item_type), planType: scalar(row.plan_type), planName: scalar(row.plan_name),
      period: scalar(row.plan_period), startsAt: scalar(row.start_date), endsAt: scalar(row.end_date),
      price: scalar(row.price), total: scalar(row.total) };
  });
}
