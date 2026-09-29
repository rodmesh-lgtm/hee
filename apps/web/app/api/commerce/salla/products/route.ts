import { db } from "../../../../lib/db";
import { consumePublicWriteLimit } from "../../../../lib/rate-limit";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../lib/whatsapp/feature-entitlement";
import { listSallaCampaignProducts } from "../../../../lib/commerce/salla-products";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
export async function GET(request: Request) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) return json({ error: "ACCESS_DENIED" }, 403);
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return json({ error: "SUBSCRIPTION_REQUIRED" }, 403);
  try {
    const rate = await consumePublicWriteLimit({ scope: "salla-products", businessId: context.businessId, identity: context.userId, limit: 30, windowSeconds: 60 });
    if (!rate.allowed) return json({ error: "RATE_LIMITED" }, 429);
    const params = new URL(request.url).searchParams;
    const integrationId = params.get("store") ?? "";
    if (!integrationId) {
      const stores = await db.whatsAppCommerceIntegration.findMany({ where: { businessId: context.businessId, provider: "salla", status: "active" },
        select: { id: true, displayName: true, externalStoreId: true }, orderBy: { createdAt: "asc" }, take: 100 });
      return json({ stores: stores.map(store => ({ id: store.id, name: store.displayName || `متجر سلة ${store.externalStoreId}` })) });
    }
    const page = Number(params.get("page") || "1"), keyword = (params.get("q") ?? "").trim();
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(integrationId) || !Number.isSafeInteger(page) || page < 1 || page > 100000 || keyword.length > 80) return json({ error: "INVALID_REQUEST" }, 400);
    return json(await listSallaCampaignProducts({ businessId: context.businessId, integrationId, keyword, page }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const allowed = ["STORE_UNAVAILABLE", "RECONNECT_REQUIRED", "PRODUCT_PERMISSION_REQUIRED", "RATE_LIMITED"];
    return json({ error: allowed.includes(code) ? code : "PRODUCTS_UNAVAILABLE" }, code === "STORE_UNAVAILABLE" ? 404 : code === "RATE_LIMITED" ? 429 : 503);
  }
}
