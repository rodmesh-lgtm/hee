const required = (name) => {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required before production environment sync`);
  return value;
};

const enabled = (name) => String(process.env[name] ?? "").trim().toLowerCase() === "true";
const CANONICAL_FROM_EMAIL = "INFRO <no-reply@ir.sa>";
const CANONICAL_HOST = "ir.sa";
const WWW_HOST = "www.ir.sa";

required("VERCEL_TOKEN");
required("VERCEL_ORG_ID");
required("VERCEL_PROJECT_ID");
required("RELEASE_SHA");
if (process.env.RELEASE_SHA !== process.env.GITHUB_SHA) throw new Error("RELEASE_SHA must equal the exact GitHub Actions SHA");
required("DATABASE_URL");
required("PG_POOL_MAX");
required("SESSION_SECRET");
required("RESEND_API_KEY");
required("CRON_SECRET");
required("BILLING_TOKEN_ENCRYPTION_KEY");
required("BILLING_RENEWAL_ENABLED");
required("BILLING_OPERATIONS_READY");
required("WHATSAPP_MARKETING_WORKER_ENABLED");
required("WHATSAPP_OUTBOUND_ENABLED");
required("STORAGE_DRIVER");

for (const name of [
  "BILLING_RENEWAL_ENABLED",
  "BILLING_OPERATIONS_READY",
  "WHATSAPP_MARKETING_WORKER_ENABLED",
  "WHATSAPP_OUTBOUND_ENABLED",
]) {
  if (!['true', 'false'].includes(required(name).toLowerCase())) throw new Error(`${name} must be true or false`);
}
if (required("CRON_SECRET").length < 32) throw new Error("CRON_SECRET must be at least 32 characters");

const billingRequired = enabled("BILLING_RENEWAL_ENABLED") || enabled("BILLING_OPERATIONS_READY");
if (billingRequired) {
  required("MOYASAR_PUBLISHABLE_KEY");
  required("MOYASAR_SECRET_KEY");
  required("MOYASAR_WEBHOOK_SECRET");
  required("BILLING_SELLER_LEGAL_NAME_AR");
  required("BILLING_SELLER_ADDRESS_AR");
  required("BILLING_TAX_STATUS");
}

const apiHeaders = {
  authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
  "content-type": "application/json",
};
const team = encodeURIComponent(process.env.VERCEL_ORG_ID);
const project = encodeURIComponent(process.env.VERCEL_PROJECT_ID);

async function vercelJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...apiHeaders, ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 500) }; }
  return { response, body };
}

async function addProjectDomain(name, redirect) {
  const payload = { name };
  if (redirect) {
    payload.redirect = redirect;
    payload.redirectStatusCode = 308;
  }
  const { response, body } = await vercelJson(
    `https://api.vercel.com/v10/projects/${project}/domains?teamId=${team}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (!response.ok && response.status !== 409) {
    throw new Error(`Unable to add ${name} to HEE Vercel project (HTTP ${response.status}, code=${body?.error?.code ?? body?.code ?? "unknown"})`);
  }
  return response.ok;
}

async function ensureCanonicalDomain(name, redirect) {
  const listing = await vercelJson(
    `https://api.vercel.com/v1/domains/${encodeURIComponent(CANONICAL_HOST)}/project-domains?teamId=${team}&limit=100`,
  );
  if (!listing.response.ok && listing.response.status !== 404) {
    throw new Error(`Unable to inspect Vercel project-domain ownership for ${CANONICAL_HOST} (HTTP ${listing.response.status})`);
  }
  const projectDomains = Array.isArray(listing.body?.projectDomains) ? listing.body.projectDomains : [];
  const current = projectDomains.find((item) => String(item?.name ?? "").toLowerCase() === name.toLowerCase());

  if (current?.projectId && String(current.projectId) !== process.env.VERCEL_PROJECT_ID) {
    const sourceProject = encodeURIComponent(String(current.projectId));
    const payload = { projectId: process.env.VERCEL_PROJECT_ID };
    if (redirect) {
      payload.redirect = redirect;
      payload.redirectStatusCode = 308;
    }
    const moved = await vercelJson(
      `https://api.vercel.com/v1/projects/${sourceProject}/domains/${encodeURIComponent(name)}/move?teamId=${team}`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    if (!moved.response.ok) {
      throw new Error(`Unable to move ${name} to HEE Vercel project (HTTP ${moved.response.status}, code=${moved.body?.error?.code ?? moved.body?.code ?? "unknown"})`);
    }
    console.log(`vercel-domain-routing: MOVED ${name} -> ${process.env.VERCEL_PROJECT_ID}`);
    return;
  }

  if (!current) {
    const added = await addProjectDomain(name, redirect);
    if (added) console.log(`vercel-domain-routing: ADDED ${name} -> ${process.env.VERCEL_PROJECT_ID}`);
  }

  const patchPayload = redirect
    ? { redirect, redirectStatusCode: 308, gitBranch: null }
    : { redirect: null, gitBranch: null };
  const patched = await vercelJson(
    `https://api.vercel.com/v9/projects/${project}/domains/${encodeURIComponent(name)}?teamId=${team}`,
    { method: "PATCH", body: JSON.stringify(patchPayload) },
  );
  if (!patched.response.ok) {
    throw new Error(`Unable to enforce canonical routing for ${name} (HTTP ${patched.response.status}, code=${patched.body?.error?.code ?? patched.body?.code ?? "unknown"})`);
  }
}

await ensureCanonicalDomain(CANONICAL_HOST, null);
await ensureCanonicalDomain(WWW_HOST, CANONICAL_HOST);

const verifiedDomains = await vercelJson(
  `https://api.vercel.com/v9/projects/${project}/domains?teamId=${team}&limit=100`,
);
if (!verifiedDomains.response.ok) throw new Error(`Unable to verify HEE Vercel domains (HTTP ${verifiedDomains.response.status})`);
const domainMap = new Map((verifiedDomains.body?.domains ?? []).map((item) => [String(item?.name ?? "").toLowerCase(), item]));
for (const name of [CANONICAL_HOST, WWW_HOST]) {
  const item = domainMap.get(name);
  if (!item) throw new Error(`${name} is not attached to the HEE Vercel project after routing repair`);
  if (item.verified !== true) throw new Error(`${name} is attached to HEE but Vercel has not verified it yet`);
}
console.log(`vercel-domain-routing: PASS canonical=${CANONICAL_HOST} www=${WWW_HOST} project=${process.env.VERCEL_PROJECT_ID}`);

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
  "WHATSAPP_MARKETING_WORKER_ENABLED", "WHATSAPP_OUTBOUND_ENABLED",
  "STORAGE_DRIVER", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET",
  "S3_FORCE_PATH_STYLE", "S3_ALLOW_INSECURE",
];
const sensitiveKeys = [
  "DATABASE_URL", "SESSION_SECRET", "RESEND_API_KEY", "CRON_SECRET",
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
    headers: apiHeaders,
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