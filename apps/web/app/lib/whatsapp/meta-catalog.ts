import "server-only";
import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "./credential-envelope";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl } from "./meta-config";
import { parseProductCarousel, type ProductCarousel } from "./product-carousel";

type CatalogContext = { businessId: string; connectionId: string; database?: Pick<PrismaClient, "$transaction">; fetcher?: typeof fetch };
export type CatalogProduct = { retailerId: string; name: string };
export async function readMetaCatalog(input: CatalogContext & { catalogId?: string }) {
  const database = input.database ?? db;
  const connection = await database.$transaction(tx => tx.whatsAppConnection.findFirst({ where: { id: input.connectionId, businessId: input.businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true }, select: { wabaId: true, credentialEnvelope: true } }));
  if (!connection || !/^\d{1,128}$/.test(connection.wabaId)) throw new Error("CATALOG_CONNECTION_UNAVAILABLE");
  const config = getMetaWhatsAppConfig();
  const token = decryptWhatsAppCredential({ businessId: input.businessId, envelope: connection.credentialEnvelope as unknown as WhatsAppCredentialEnvelope, encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY });
  const signal = AbortSignal.timeout(20000);
  async function get(path: string, params: Record<string, string>) {
    const url = new URL(metaWhatsAppGraphUrl(config, path));
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await (input.fetcher ?? fetch)(url, { cache: "no-store", redirect: "error", signal, headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("CATALOG_READ_UNAVAILABLE");
    const value = await response.json();
    if (!Array.isArray(value?.data)) throw new Error("CATALOG_RESPONSE_INVALID");
    return value as { data: Array<Record<string, unknown>>; paging?: { cursors?: { after?: string }; next?: string } };
  }
  const response = await get(`${connection.wabaId}/product_catalogs`, { fields: "id,name", limit: "100" });
  const catalogs = response.data.filter(c => typeof c.id === "string" && /^\d{1,128}$/.test(c.id)).map(c => ({ id: c.id as string, name: typeof c.name === "string" ? c.name.slice(0, 200) : "كتالوج Meta" }));
  if (!input.catalogId) return { catalogs, products: [] as CatalogProduct[], truncated: false };
  if (!catalogs.some(c => c.id === input.catalogId)) throw new Error("CATALOG_NOT_LINKED_TO_CONNECTION");
  const products: CatalogProduct[] = [];
  let after = "", truncated = false;
  for (let page = 0; page < 5; page++) {
    const result = await get(`${input.catalogId}/products`, { fields: "retailer_id,name", limit: "100", ...(after ? { after } : {}) });
    for (const p of result.data) if (typeof p.retailer_id === "string" && p.retailer_id.length <= 100 && !products.some(existing => existing.retailerId === p.retailer_id)) products.push({ retailerId: p.retailer_id, name: typeof p.name === "string" ? p.name.slice(0, 200) : p.retailer_id });
    after = typeof result.paging?.cursors?.after === "string" ? result.paging.cursors.after : "";
    if (!result.paging?.next || !after || after.length > 2048) { truncated = false; break; }
    truncated = true;
  }
  return { catalogs, products, truncated };
}
export async function validateMetaCarousel(input: CatalogContext & { selection: ProductCarousel }) {
  const selection = parseProductCarousel(input.selection);
  const catalog = await readMetaCatalog({ ...input, catalogId: selection.catalogId });
  if (selection.retailerIds.some(id => !catalog.products.some(p => p.retailerId === id))) throw new Error("CATALOG_PRODUCT_NOT_FOUND");
}
