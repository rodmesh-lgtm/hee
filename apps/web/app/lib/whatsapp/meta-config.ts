import "server-only";

import { z } from "zod";

const billingModes = ["customer_meta", "ir_pass_through"] as const;

const metaWhatsAppConfigSchema = z.object({
  META_APP_ID: z.string().trim().min(1),
  META_APP_SECRET: z.string().trim().min(16),
  META_BUSINESS_ID: z.string().trim().min(1),
  META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: z.string().trim().min(1),
  META_WHATSAPP_SYSTEM_USER_ID: z.string().trim().min(1),
  META_WHATSAPP_SYSTEM_USER_TOKEN: z.string().trim().min(20),
  META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().trim().min(24),
  META_WHATSAPP_GRAPH_VERSION: z.string().trim().regex(/^v\d+\.\d+$/),
  META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY: z.string().trim().min(32),
  META_WHATSAPP_BILLING_MODE: z.enum(billingModes),
});

export type MetaWhatsAppConfig = z.infer<typeof metaWhatsAppConfigSchema>;
export type MetaWhatsAppBillingMode = (typeof billingModes)[number];

export const META_WHATSAPP_SECRET_NAMES = [
  "META_APP_SECRET",
  "META_WHATSAPP_SYSTEM_USER_TOKEN",
  "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY",
] as const;

/**
 * WhatsApp is an optional feature. Do not read or validate its secrets during a normal
 * iR boot/build. A WhatsApp server route/worker must call this at the point where the
 * integration is actually required; missing or malformed configuration then fails closed.
 */
export function getMetaWhatsAppConfig(env: NodeJS.ProcessEnv = process.env): MetaWhatsAppConfig {
  const parsed = metaWhatsAppConfigSchema.safeParse(env);
  if (!parsed.success) {
    const missingOrInvalid = parsed.error.issues
      .map((issue) => String(issue.path[0] ?? "unknown"))
      .filter((name, index, values) => values.indexOf(name) === index)
      .sort();
    // Never include environment values in this error: configuration errors can reach
    // deployment logs and must remain safe even when a secret itself is malformed.
    throw new Error(`META_WHATSAPP_CONFIG_INVALID:${missingOrInvalid.join(",")}`);
  }
  return parsed.data;
}

export function metaWhatsAppGraphUrl(config: Pick<MetaWhatsAppConfig, "META_WHATSAPP_GRAPH_VERSION">, path: string) {
  const cleanPath = path.replace(/^\/+/, "");
  if (!cleanPath || cleanPath.includes("?") || cleanPath.includes("#")) {
    throw new Error("META_WHATSAPP_GRAPH_PATH_INVALID");
  }
  return `https://graph.facebook.com/${config.META_WHATSAPP_GRAPH_VERSION}/${cleanPath}`;
}
