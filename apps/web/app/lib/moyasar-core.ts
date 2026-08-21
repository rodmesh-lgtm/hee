import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const MOYASAR_API_BASE = "https://api.moyasar.com/v1";
const REQUEST_TIMEOUT_MS = 12_000;

export type MoyasarPayment = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at?: string | null;
  updated_at?: string | null;
  description?: string | null;
  metadata?: Record<string, string> | null;
  source?: {
    type?: string;
    company?: string;
    number?: string;
    token?: string;
    transaction_url?: string | null;
  } | null;
};

export type MoyasarWebhook = {
  id: string;
  type: string;
  secret_token?: string;
  live?: boolean;
  data?: MoyasarPayment;
};

function required(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function basicAuth(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`, "utf8").toString("base64")}`;
}

async function moyasarRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${MOYASAR_API_BASE}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: basicAuth(required("MOYASAR_SECRET_KEY")),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const body = await response.text();
    if (!response.ok) {
      console.error("[moyasar] api_error", { path, status: response.status });
      throw new Error(`MOYASAR_HTTP_${response.status}`);
    }
    return JSON.parse(body) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function moyasarPublishableKey() {
  return String(process.env.MOYASAR_PUBLISHABLE_KEY ?? "").trim();
}

export function moyasarConfigured() {
  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") return false;
  const publishable = moyasarPublishableKey();
  const secret = String(process.env.MOYASAR_SECRET_KEY ?? "").trim();
  const webhook = String(process.env.MOYASAR_WEBHOOK_SECRET ?? "").trim();
  const encryption = String(process.env.BILLING_TOKEN_ENCRYPTION_KEY ?? "").trim();
  if (!publishable || !secret || !webhook || !encryption) return false;

  const production = String(process.env.APP_ENV ?? "").trim().toLowerCase() === "production";
  return production
    ? publishable.startsWith("pk_live_") && secret.startsWith("sk_live_")
    : publishable.startsWith("pk_test_") && secret.startsWith("sk_test_");
}

export async function fetchMoyasarPayment(paymentId: string) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(paymentId)) throw new Error("INVALID_MOYASAR_PAYMENT_ID");
  return moyasarRequest<MoyasarPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function createMoyasarTokenPayment(input: {
  givenId: string;
  token: string;
  amount: number;
  description: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}) {
  return moyasarRequest<MoyasarPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      given_id: input.givenId,
      amount: input.amount,
      currency: "SAR",
      description: input.description,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      source: { type: "token", token: input.token },
    }),
  });
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyMoyasarWebhookSecret(value: unknown) {
  const expected = String(process.env.MOYASAR_WEBHOOK_SECRET ?? "").trim();
  const received = String(value ?? "");
  return Boolean(expected && received && safeEqual(expected, received));
}

function encryptionKey() {
  const encoded = required("BILLING_TOKEN_ENCRYPTION_KEY");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("BILLING_TOKEN_ENCRYPTION_KEY_INVALID");
  const raw = Buffer.from(encoded, "base64");
  if (raw.length !== 32) throw new Error("BILLING_TOKEN_ENCRYPTION_KEY_INVALID");
  return raw;
}

export function encryptProviderToken(token: string) {
  if (!token || token.length > 512) throw new Error("INVALID_PROVIDER_TOKEN");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptProviderToken(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) throw new Error("INVALID_ENCRYPTED_TOKEN");
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const encrypted = Buffer.from(encryptedText, "base64url");
  if (iv.length !== 12 || tag.length !== 16 || encrypted.length < 1) throw new Error("INVALID_ENCRYPTED_TOKEN");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const clear = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  if (!clear) throw new Error("INVALID_ENCRYPTED_TOKEN");
  return clear;
}

export function maskedLast4(source: MoyasarPayment["source"]) {
  const number = String(source?.number ?? "");
  const digits = number.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}
