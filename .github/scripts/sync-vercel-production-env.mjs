const required = (name) => {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required before production environment sync`);
  return value;
};

const enabled = (name) => String(process.env[name] ?? "").trim().toLowerCase() === "true";
const CANONICAL_FROM_EMAIL = "HEE <no-reply@ir.sa>";

required("VERCEL_TOKEN");
required("VERCEL_ORG_ID");
required("VERCEL_PROJECT_ID");
required("RELEASE_SHA");
if (process.env.RELEASE_SHA !== process.env.GITHUB_SHA) throw new Error("RELEASE_SHA must equal the exact GitHub Actions SHA");
required("DATABASE_URL");
required("PG_POOL_MAX");
required("SESSION_SECRET");
required("RESEND_API_KEY");
required("BILLING_TOKEN_ENCRYPTION_KEY");
required("BILLING_RENEWAL_ENABLED");
required("BILLING_OPERATIONS_READY");
required("STORAGE_DRIVER");

const billingRequired = enabled("BILLING_RENEWAL_ENABLED") || enabled("BILLING_OPERATIONS_READY");
if (billingRequired) {
  required("MOYASAR_PUBLISHABLE_KEY");
  required("MOYASAR_SECRET_KEY");
  required("MOYASAR_WEBHOOK_SECRET");
  required("BILLING_SELLER_LEGAL_NAME_AR");
  required("BILLING_SELLER_ADDRESS_AR");
  required("BILLING_TAX_STATUS");
}

// Maintenance and paid-launch modes are deliberately NOT persisted as mutable
// project-level state. Ordinary Production sync always restores the safe billing
// baseline (public checkout closed, no rehearsal account). Controlled workflows
// may override these values only on one exact-SHA staged deployment.
if (Object.prototype.hasOwnProperty.call(process.env, "PRODUCTION_MAINTENANCE_MODE")) {
  throw new Error("PRODUCTION_MAINTENANCE_MODE must remain deployment-scoped and must not be synced to the Vercel project environment");
}

const plainKeys = [
  "APP_ENV", "APP_URL", "AUTH_ORIGIN", "NEXT_PUBLIC_APP_URL", "API_URL", "RELEASE_SHA",
  "PG_POOL_MAX", "PAYMENT_PROVIDER",
  "BILLING_SELLER_LEGAL_NAME_AR", "BILLING_SELLER_ADDRESS_AR", "BILLING_TAX_STATUS",
  "BILLING_RENEWAL_ENABLED", "BILLING_OPERATIONS_READY",
  "STORAGE_DRIVER", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET",
  "S3_FORCE_PATH_STYLE", "S3_ALLOW_INSECURE",
];
const sensitiveKeys = [
  "DATABASE_URL", "SESSION_SECRET", "RESEND_API_KEY",
  "MOYASAR_PUBLISHABLE_KEY", "MOYASAR_SECRET_KEY", "MOYASAR_WEBHOOK_SECRET",
  "BILLING_TOKEN_ENCRYPTION_KEY", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APPLE_CLIENT_ID", "APPLE_TEAM_ID",
  "APPLE_KEY_ID", "APPLE_PRIVATE_KEY",
];

const entries = [
  ...plainKeys.map((key) => ({ key, value: String(process.env[key] ?? ""), type: "plain", target: ["production"] })),
  ...sensitiveKeys.map((key) => ({ key, value: String(process.env[key] ?? ""), type: "sensitive", target: ["production"] })),
  { key: "HEE_FROM_EMAIL", value: CANONICAL_FROM_EMAIL, type: "plain", target: ["production"] },
  { key: "PAID_CHECKOUT_PUBLIC_ENABLED", value: "false", type: "plain", target: ["production"] },
  { key: "BILLING_REHEARSAL_USER_EMAIL", value: "", type: "plain", target: ["production"] },
  { key: "QA_AUDIT_SECRET", value: "", type: "sensitive", target: ["production"] },
  { key: "QA_AUDIT_USER_EMAIL", value: "", type: "plain", target: ["production"] },
];

const response = await fetch(
  `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/env?upsert=true&teamId=${process.env.VERCEL_ORG_ID}`,
  {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(entries),
    signal: AbortSignal.timeout(30_000),
  },
);

if (!response.ok) {
  throw new Error(`Vercel production environment sync failed with HTTP ${response.status}`);
}
const result = await response.json();
if (Array.isArray(result?.failed) && result.failed.length) {
  throw new Error(`Vercel production environment sync reported ${result.failed.length} failed entries`);
}
console.log(`vercel-production-env-sync: PASS (${entries.length} keys, canonical sender pinned, paid launch defaults closed, billingRequired=${billingRequired}; values not logged)`);
