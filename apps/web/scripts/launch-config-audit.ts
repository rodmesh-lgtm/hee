import "dotenv/config";

function required(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required for production launch`);
  return value;
}

function canonical(name: string) {
  const value = required(name).replace(/\/$/, "");
  if (value !== "https://hee.sa") throw new Error(`${name} must equal https://hee.sa`);
}

function liveKey(name: string, prefix: string) {
  const value = required(name);
  if (!value.startsWith(prefix) || /replace|example|test|dummy|change/i.test(value)) {
    throw new Error(`${name} must be a non-placeholder live Moyasar key (${prefix}...)`);
  }
}

function strongSecret(name: string, minLength: number) {
  const value = required(name);
  if (value.length < minLength || /replace-me|change-this|ci-only|example|dummy|placeholder/i.test(value)) {
    throw new Error(`${name} must be a strong non-placeholder production secret`);
  }
  return value;
}

function strictBase64Key(name: string) {
  const encoded = required(name);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
    throw new Error(`${name} must be canonical base64`);
  }
  const raw = Buffer.from(encoded, "base64");
  if (raw.length !== 32 || raw.toString("base64") !== encoded) {
    throw new Error(`${name} must be canonical base64 encoding of exactly 32 random bytes`);
  }
}

function productionDatabaseUrl() {
  const raw = required("DATABASE_URL");
  let parsed: URL;
  try { parsed = new URL(raw); }
  catch { throw new Error("DATABASE_URL must be a valid PostgreSQL URL"); }
  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) throw new Error("DATABASE_URL must use PostgreSQL");
  if (!parsed.hostname || ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase())) {
    throw new Error("DATABASE_URL must not point to localhost in production");
  }
  if (/\b(?:test|ci|dev|local)\b/i.test(parsed.pathname.replace(/^\//, ""))) {
    throw new Error("DATABASE_URL appears to reference a non-production database");
  }

  const sslMode = parsed.searchParams.get("sslmode")?.trim().toLowerCase();
  if (!sslMode || !new Set(["verify-full", "verify-ca", "require", "prefer"]).has(sslMode)) {
    throw new Error("DATABASE_URL must explicitly enable PostgreSQL TLS with sslmode=verify-full (legacy strict modes are normalized to verify-full at runtime)");
  }
}

function productionPoolBudget() {
  const raw = required("PG_POOL_MAX");
  if (!/^\d+$/.test(raw)) throw new Error("PG_POOL_MAX must be an integer between 1 and 5 for the production web runtime");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 5) {
    throw new Error("PG_POOL_MAX must be between 1 and 5 for the production web runtime; start at 2 unless the PostgreSQL connection budget proves a higher value is safe");
  }
}

function billingTaxReadiness() {
  required("BILLING_SELLER_LEGAL_NAME_AR");
  required("BILLING_SELLER_ADDRESS_AR");
  const status = required("BILLING_TAX_STATUS").toLowerCase();
  if (!new Set(["not_registered", "vat_registered"]).has(status)) {
    throw new Error("BILLING_TAX_STATUS must be not_registered or vat_registered");
  }
  if (status === "vat_registered") {
    throw new Error("Paid launch is blocked for a VAT-registered seller until the ZATCA-compliant e-invoicing integration is implemented and verified");
  }
}

function main() {
  if (String(process.env.APP_ENV ?? "").trim().toLowerCase() !== "production") {
    throw new Error("APP_ENV must be production for the launch audit");
  }

  canonical("APP_URL");
  canonical("AUTH_ORIGIN");
  canonical("NEXT_PUBLIC_APP_URL");

  strongSecret("SESSION_SECRET", 32);
  productionDatabaseUrl();
  productionPoolBudget();

  const resend = required("RESEND_API_KEY");
  if (/replace|example|dummy|placeholder/i.test(resend)) throw new Error("RESEND_API_KEY must be a real production credential");
  const from = required("HEE_FROM_EMAIL");
  if (!/@hee\.sa(?:>|\s|$)/i.test(from)) throw new Error("HEE_FROM_EMAIL must use the verified hee.sa sending domain");

  const paymentProvider = required("PAYMENT_PROVIDER").toLowerCase();
  if (paymentProvider !== "moyasar") throw new Error("PAYMENT_PROVIDER must equal moyasar for paid production launch");
  liveKey("MOYASAR_PUBLISHABLE_KEY", "pk_live_");
  liveKey("MOYASAR_SECRET_KEY", "sk_live_");
  strongSecret("MOYASAR_WEBHOOK_SECRET", 24);
  strictBase64Key("BILLING_TOKEN_ENCRYPTION_KEY");
  billingTaxReadiness();
  if (String(process.env.BILLING_RENEWAL_ENABLED ?? "").trim().toLowerCase() !== "true") {
    throw new Error("BILLING_RENEWAL_ENABLED must be true only after the renewal worker and live webhook have been verified");
  }
  if (String(process.env.BILLING_OPERATIONS_READY ?? "").trim().toLowerCase() !== "true") {
    throw new Error("BILLING_OPERATIONS_READY must be true only after the recurring billing/webhook recovery schedule has been installed and observed running successfully");
  }
  if (String(process.env.PAID_CHECKOUT_PUBLIC_ENABLED ?? "").trim().toLowerCase() !== "true") {
    throw new Error("PAID_CHECKOUT_PUBLIC_ENABLED must be true only after the controlled live subscription rehearsal passes");
  }
  if (String(process.env.BILLING_REHEARSAL_USER_EMAIL ?? "").trim()) {
    throw new Error("BILLING_REHEARSAL_USER_EMAIL must be removed before general paid launch");
  }

  if (String(process.env.QA_AUDIT_SECRET ?? "").trim() || String(process.env.QA_AUDIT_USER_EMAIL ?? "").trim()) {
    throw new Error("QA audit credentials must not be configured in production");
  }

  const storageDriver = String(process.env.STORAGE_DRIVER ?? "database").trim().toLowerCase();
  if (!new Set(["database", "s3"]).has(storageDriver)) throw new Error("STORAGE_DRIVER must be database or s3");
  if (storageDriver === "s3") {
    const endpoint = required("S3_ENDPOINT");
    if (!endpoint.startsWith("https://")) throw new Error("Production S3_ENDPOINT must use HTTPS");
    required("S3_BUCKET");
    strongSecret("S3_ACCESS_KEY_ID", 8);
    strongSecret("S3_SECRET_ACCESS_KEY", 16);
    if (String(process.env.S3_ALLOW_INSECURE ?? "").trim().toLowerCase() === "true") throw new Error("S3_ALLOW_INSECURE must not be true in production");
  }

  const googleId = String(process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const googleSecret = String(process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
  if (Boolean(googleId) !== Boolean(googleSecret)) throw new Error("Google OAuth must be fully configured or fully disabled");

  const appleValues = ["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"].map((name) => String(process.env[name] ?? "").trim());
  if (appleValues.some(Boolean) && !appleValues.every(Boolean)) throw new Error("Apple OAuth must be fully configured or fully disabled");

  console.log("launch-config-audit: PASS");
}

try { main(); }
catch (error) {
  console.error("launch-config-audit: FAIL", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
