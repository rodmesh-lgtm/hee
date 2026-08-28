import { NextResponse } from "next/server";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppWriteContext } from "../../../../../lib/whatsapp/rbac";
import { completeShopifyAuthorization } from "../../../../../lib/whatsapp/shopify-commerce";
import { getShopifyConfig, shopifyAppOrigin } from "../../../../../lib/whatsapp/shopify-config";
import { normalizeShopifyDomain, verifyShopifyOAuthHmac } from "../../../../../lib/whatsapp/shopify-domain";

function back(request: Request, result: string) {
  const origin = shopifyAppOrigin();
  return NextResponse.redirect(new URL(`/dashboard/whatsapp/integrations?shopify=${encodeURIComponent(result)}`, origin || new URL(request.url).origin));
}

function single(params: URLSearchParams, key: string) {
  const values = params.getAll(key);
  return values.length === 1 ? values[0] : "";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("error")) return back(request, "cancelled");
  let config;
  try { config = getShopifyConfig(); }
  catch { return back(request, "not-configured"); }
  if (!verifyShopifyOAuthHmac(params, config.SHOPIFY_CLIENT_SECRET)) return back(request, "invalid-signature");

  const state = single(params, "state");
  const code = single(params, "code");
  const timestamp = Number(single(params, "timestamp"));
  let shop: string;
  try { shop = normalizeShopifyDomain(single(params, "shop")); }
  catch { return back(request, "invalid-shop"); }
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp * 1000) > 10 * 60 * 1000) return back(request, "expired-callback");
  if (state.length < 32 || state.length > 128 || code.length < 8 || code.length > 4096) return back(request, "invalid-callback");

  const context = await getWhatsAppWriteContext("connection.manage");
  if (!context) return back(request, "forbidden");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return back(request, "entitlement-required");
  try {
    await completeShopifyAuthorization({ businessId: context.businessId, userId: context.userId, state, code, shop });
    return back(request, "connected");
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const safe = code === "SHOPIFY_SHOP_ALREADY_ASSIGNED" ? "shop-assigned" : code === "SHOPIFY_SCOPES_MISSING" ? "scopes-missing" : code === "SHOPIFY_OAUTH_SESSION_INVALID" ? "session-expired" : "activation-failed";
    return back(request, safe);
  }
}
