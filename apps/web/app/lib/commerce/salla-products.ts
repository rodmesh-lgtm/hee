import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { decryptCommerceCredential, type CommerceCredentialEnvelope } from "../whatsapp/commerce-credential-envelope";
import { getSallaConfig } from "./salla-config";
import { mapSallaCampaignProduct } from "./salla-product-domain";

export async function listSallaCampaignProducts(input: { businessId: string; integrationId: string; keyword: string; page: number }) {
  const integration = await db.whatsAppCommerceIntegration.findFirst({
    where: { id: input.integrationId, businessId: input.businessId, provider: "salla", status: "active" },
    select: { id: true, credentialEnvelope: true },
  });
  if (!integration?.credentialEnvelope) throw new Error("STORE_UNAVAILABLE");
  const item = integration.credentialEnvelope as Prisma.JsonObject;
  if (item.v !== 1 || item.alg !== "aes-256-gcm" || typeof item.keyVersion !== "string" || typeof item.iv !== "string" || typeof item.ciphertext !== "string" || typeof item.tag !== "string") throw new Error("RECONNECT_REQUIRED");
  const config = getSallaConfig();
  const credential = JSON.parse(decryptCommerceCredential({ envelope: item as CommerceCredentialEnvelope,
    encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY, businessId: input.businessId, integrationId: integration.id, provider: "salla",
  })) as { accessToken?: unknown };
  if (typeof credential.accessToken !== "string" || credential.accessToken.length < 16) throw new Error("RECONNECT_REQUIRED");
  const url = new URL("https://api.salla.dev/admin/v2/products");
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("per_page", "20");
  url.searchParams.set("status", "sale");
  if (input.keyword) url.searchParams.set("keyword", input.keyword);
  const response = await fetch(url, { headers: { authorization: `Bearer ${credential.accessToken}`, accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (response.status === 401) throw new Error("RECONNECT_REQUIRED");
  if (response.status === 403) throw new Error("PRODUCT_PERMISSION_REQUIRED");
  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (!response.ok) throw new Error("PRODUCTS_UNAVAILABLE");
  const payload = await response.json() as { data?: unknown };
  if (!Array.isArray(payload.data)) throw new Error("PRODUCTS_UNAVAILABLE");
  return { products: payload.data.slice(0, 20).map(mapSallaCampaignProduct).filter(product => product !== null), hasMore: payload.data.length >= 20, page: input.page, fetchedAt: new Date().toISOString() };
}
