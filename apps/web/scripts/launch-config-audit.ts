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

function main() {
  if (String(process.env.APP_ENV ?? "").trim().toLowerCase() !== "production") {
    throw new Error("APP_ENV must be production for the launch audit");
  }

  canonical("APP_URL");
  canonical("AUTH_ORIGIN");
  canonical("NEXT_PUBLIC_APP_URL");

  const sessionSecret = required("SESSION_SECRET");
  if (sessionSecret.length < 32 || /replace-me|change-this|ci-only/i.test(sessionSecret)) {
    throw new Error("SESSION_SECRET must be a strong non-placeholder production secret");
  }

  required("DATABASE_URL");
  required("RESEND_API_KEY");
  const from = required("HEE_FROM_EMAIL");
  if (!/@hee\.sa(?:>|\s|$)/i.test(from)) throw new Error("HEE_FROM_EMAIL must use the verified hee.sa sending domain");

  const paymentProvider = required("PAYMENT_PROVIDER").toLowerCase();
  if (paymentProvider === "mock") throw new Error("PAYMENT_PROVIDER=mock is forbidden for paid production launch");

  if (String(process.env.QA_AUDIT_SECRET ?? "").trim() || String(process.env.QA_AUDIT_USER_EMAIL ?? "").trim()) {
    throw new Error("QA audit credentials must not be configured in production");
  }

  const storageDriver = String(process.env.STORAGE_DRIVER ?? "database").trim().toLowerCase();
  if (!new Set(["database", "s3"]).has(storageDriver)) throw new Error("STORAGE_DRIVER must be database or s3");
  if (storageDriver === "s3") {
    const endpoint = required("S3_ENDPOINT");
    if (!endpoint.startsWith("https://")) throw new Error("Production S3_ENDPOINT must use HTTPS");
    required("S3_BUCKET");
    required("S3_ACCESS_KEY_ID");
    required("S3_SECRET_ACCESS_KEY");
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
