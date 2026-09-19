import "server-only";

import { z } from "zod";

const schema = z.object({
  SALLA_CLIENT_ID: z.string().trim().min(8).max(255),
  SALLA_CLIENT_SECRET: z.string().trim().min(16).max(512),
  SALLA_WEBHOOK_SECRET: z.string().trim().min(16).max(512),
  SALLA_OAUTH_SCOPES: z.string().trim().min(1).max(1000).default("offline_access"),
  WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY: z.string().trim().min(32),
  WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION: z.string().trim().regex(/^[A-Za-z0-9._-]{1,32}$/),
});

export function sallaConfigured(env: NodeJS.ProcessEnv = process.env) {
  return schema.safeParse(env).success;
}

export function getSallaConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => String(issue.path[0] ?? "unknown"))
      .filter((name, index, values) => values.indexOf(name) === index).sort();
    throw new Error(`SALLA_CONFIG_INVALID:${names.join(",")}`);
  }
  return parsed.data;
}

export function sallaAppOrigin(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV === "production") return "https://ir.sa";
  const candidate = String(env.AUTH_ORIGIN || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const local = (host === "localhost" || host === "127.0.0.1") && url.protocol === "http:";
    const safePreview = url.protocol === "https:" && (host.endsWith(".vercel.app") || host.endsWith(".app.github.dev") || host === "ir.sa" || host === "www.ir.sa");
    if (local || safePreview) return url.origin;
  } catch {
    // Fall back to the canonical production origin.
  }
  return "https://ir.sa";
}

export function sallaOAuthCallbackUrl(env: NodeJS.ProcessEnv = process.env) {
  return `${sallaAppOrigin(env)}/api/commerce/salla/callback`;
}

export function sallaWebhookCallbackUrl(env: NodeJS.ProcessEnv = process.env) {
  return `${sallaAppOrigin(env)}/api/commerce/salla/webhook`;
}
