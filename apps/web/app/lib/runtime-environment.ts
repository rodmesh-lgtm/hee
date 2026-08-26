export function appEnvironment() {
  return String(process.env.APP_ENV ?? "").trim().toLowerCase();
}

export function vercelEnvironment() {
  return String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
}

export function isProductionRuntime() {
  return appEnvironment() === "production" || vercelEnvironment() === "production";
}

export function isExplicitTestRuntime() {
  return appEnvironment() === "test" && vercelEnvironment() !== "production";
}
