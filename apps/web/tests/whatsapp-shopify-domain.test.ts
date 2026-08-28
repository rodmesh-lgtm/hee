import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { hasRequiredShopifyScopes, normalizeShopifyDomain, verifyShopifyOAuthHmac } from "../app/lib/whatsapp/shopify-domain";

test("Shopify domains and required scopes fail closed", () => {
  assert.equal(normalizeShopifyDomain(" Example-Store.MyShopify.Com "), "example-store.myshopify.com");
  assert.throws(() => normalizeShopifyDomain("example.com"), /SHOPIFY_SHOP_INVALID/);
  assert.throws(() => normalizeShopifyDomain("evil.myshopify.com.attacker.test"), /SHOPIFY_SHOP_INVALID/);
  assert.equal(hasRequiredShopifyScopes("read_orders,read_customers", ["read_orders", "read_customers"]), true);
  assert.equal(hasRequiredShopifyScopes("read_orders", ["read_orders", "read_customers"]), false);
});

test("Shopify OAuth callback HMAC covers the canonical query and rejects changes", () => {
  const secret = "test-client-secret-long-enough";
  const params = new URLSearchParams({ code: "code-value", shop: "example.myshopify.com", state: "state-value", timestamp: "1787934000" });
  const message = "code=code-value&shop=example.myshopify.com&state=state-value&timestamp=1787934000";
  params.set("hmac", createHmac("sha256", secret).update(message).digest("hex"));
  assert.equal(verifyShopifyOAuthHmac(params, secret), true);
  params.set("shop", "other.myshopify.com");
  assert.equal(verifyShopifyOAuthHmac(params, secret), false);
  params.set("hmac", "not-hex");
  assert.equal(verifyShopifyOAuthHmac(params, secret), false);
  params.append("hmac", "0".repeat(64));
  assert.equal(verifyShopifyOAuthHmac(params, secret), false);
});
