const required = (name) => {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required before production environment sync`);
  return value;
};

required("VERCEL_TOKEN");
required("VERCEL_ORG_ID");
required("VERCEL_PROJECT_ID");
required("RELEASE_SHA");
if (process.env.RELEASE_SHA !== process.env.GITHUB_SHA) throw new Error("RELEASE_SHA must equal the exact GitHub Actions SHA");
required("DATABASE_URL");
required("PG_POOL_MAX");
required("SESSION_SECRET");
required("RESEND_API_KEY");
required("HEE_FROM_EMAIL");
required("MOYASAR_PUBLISHABLE_KEY");
required("MOYASAR_SECRET_KEY");
required("MOYASAR_WEBHOOK_SECRET");
required("BILLING_TOKEN_ENCRYPTION_KEY");
required("BILLING_SELLER_LEGAL_NAME_AR");
required("BILLING_SELLER_ADDRESS_AR");
required("BILLING_TAX_STATUS");
required("BILLING_RENEWAL_ENABLED");
required("BILLING_OPERATIONS_READY");
required("PAID_CHECKOUT_PUBLIC_ENABLED");
required("STORAGE_DRIVER");

const maintenance = required("PRODUCTION_MAINTENANCE_MODE").toLowerCase();
if (!new Set(["true", "false"]).has(maintenance)) {
  throw new Error("PRODUCTION_MAINTENANCE_MODE must be exactly true or false");
}

const plainKeys = [
  "APP_ENV", "APP_URL", "AUTH_ORIGIN", "NEXT_PUBLIC_APP_URL", "API_URL", "RELEASE_SHA",
  "PG_POOL_MAX", "HEE_FROM_EMAIL", "PAYMENT_PROVIDER", "PRODUCTION_MAINTENANCE_MODE",
  "BILLING_SELLER_LEGAL_NAME_AR", "BILLING_SELLER_ADDRESS_AR", "BILLING_TAX_STATUS",
  "BILLING_RENEWAL_ENABLED", "BILLING_OPERATIONS_READY", "PAID_CHECKOUT_PUBLIC_ENABLED",
  "BILLING_REHEARSAL_USER_EMAIL", "STORAGE_DRIVER", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET",
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
console.log(`vercel-production-env-sync: PASS (${entries.length} keys, maintenance=${maintenance}, values not logged)`);
