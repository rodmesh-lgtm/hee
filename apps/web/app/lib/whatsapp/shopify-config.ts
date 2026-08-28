import "server-only";

import { z } from "zod";

const schema = z.object({
  SHOPIFY_CLIENT_ID: z.string().trim().min(8).max(255),
  SHOPIFY_CLIENT_SECRET: z.string().trim().min(16).max(512),
  SHOPIFY_ADMIN_API_VERSION: z.string().trim().regex(/^20\d{2}-(01|04|07|10)$/),
  WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY: z.string().trim().min(32),
  WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION: z.string().trim().regex(/^[A-Za-z0-9._-]{1,32}$/),
});

export const SHOPIFY_REQUIRED_SCOPES = ["read_orders", "read_customers"] as const;

export function shopifyConfigured(env: NodeJS.ProcessEnv = process.env) {
  return schema.safeParse(env).success;
}

export function getShopifyConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => String(issue.path[0] ?? "unknown"))
      .filter((name, index, values) => values.indexOf(name) === index).sort();
    throw new Error(`SHOPIFY_CONFIG_INVALID:${names.join(",")}`);
  }
  return parsed.data;
}

export function shopifyAppOrigin(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV === "production") return "https://ir.sa";
  const candidate = String(env.AUTH_ORIGIN || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const local = (host === "localhost" || host === "127.0.0.1") && url.protocol === "http:";
    const httpsAllowed = url.protocol === "https:" && (host.endsWith(".vercel.app") || host.endsWith(".app.github.dev") || host === "ir.sa" || host === "www.ir.sa");
    if (local || httpsAllowed) return url.origin;
  } catch {
    // Fail to the canonical production origin.
  }
  return "https://ir.sa";
}

export function shopifyOAuthCallbackUrl(env: NodeJS.ProcessEnv = process.env) {
  return `${shopifyAppOrigin(env)}/api/whatsapp/commerce/shopify/callback`;
}

export function shopifyWebhookCallbackUrl(env: NodeJS.ProcessEnv = process.env) {
  return `${shopifyAppOrigin(env)}/api/whatsapp/commerce/shopify/webhook`;
}
