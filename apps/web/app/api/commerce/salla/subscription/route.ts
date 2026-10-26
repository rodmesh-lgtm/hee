import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";
import { readSallaSubscription, sallaSubscriptionSummary } from "../../../../lib/commerce/salla-subscription-read";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });

export async function GET(request: Request) {
  const context = await getWhatsAppReadContext("connection.manage");
  if (!context) return json({ error: "ACCESS_DENIED" }, 403);
  const store = new URL(request.url).searchParams.get("store") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(store)) return json({ error: "INVALID_STORE" }, 400);
  try {
    const rate = await consumePublicWriteLimit({ scope: "salla-subscription-read", businessId: context.businessId, identity: context.userId, limit: 10, windowSeconds: 60 });
    if (!rate.allowed) return json({ error: "RATE_LIMITED" }, 429);
    const result = await readSallaSubscription({ businessId: context.businessId, integrationId: store });
    return json({ subscriptions: sallaSubscriptionSummary(result.subscriptions), fetchedAt: result.fetchedAt.toISOString(),
      entitlementSync: "not_enabled", source: "salla" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const exposed = ["SALLA_INTEGRATION_UNAVAILABLE", "SALLA_SUBSCRIPTION_PERMISSION_REQUIRED", "SALLA_RECONNECT_REQUIRED"].includes(code);
    return json({ error: exposed ? code : "SALLA_SUBSCRIPTION_UNAVAILABLE" }, code === "SALLA_INTEGRATION_UNAVAILABLE" ? 404 : 503);
  }
}
