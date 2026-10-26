import "server-only";
import { getSallaAccessToken } from "./salla-access-token";
import { mapSallaCampaignProduct } from "./salla-product-domain";

export async function listSallaCampaignProducts(input: { businessId: string; integrationId: string; keyword: string; page: number }) {
  let token = await getSallaAccessToken({ businessId: input.businessId, integrationId: input.integrationId });
  const url = new URL("https://api.salla.dev/admin/v2/products");
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("per_page", "20");
  url.searchParams.set("status", "sale");
  if (input.keyword) url.searchParams.set("keyword", input.keyword);
  const requestPage = () => fetch(url, { headers: { authorization: `Bearer ${token}`, accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  let response = await requestPage();
  if (response.status === 401) {
    token = await getSallaAccessToken({ businessId: input.businessId, integrationId: input.integrationId, rejectedAccessToken: token });
    response = await requestPage();
  }
  if (response.status === 401) throw new Error("RECONNECT_REQUIRED");
  if (response.status === 403) throw new Error("PRODUCT_PERMISSION_REQUIRED");
  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (!response.ok) throw new Error("PRODUCTS_UNAVAILABLE");
  const payload = await response.json() as { data?: unknown };
  if (!Array.isArray(payload.data)) throw new Error("PRODUCTS_UNAVAILABLE");
  return { products: payload.data.slice(0, 20).map(mapSallaCampaignProduct).filter(product => product !== null), hasMore: payload.data.length >= 20, page: input.page, fetchedAt: new Date().toISOString() };
}
