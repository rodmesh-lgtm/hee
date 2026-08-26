const POSTGRES_PROTOCOLS = new Set(["postgresql:", "postgres:"]);
const LEGACY_STRICT_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizePostgresDatabaseUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("HEE database configuration is invalid: DATABASE_URL is not a valid URL");
  }

  if (!POSTGRES_PROTOCOLS.has(parsed.protocol) || !parsed.hostname || parsed.hostname.toLowerCase() === "base") {
    throw new Error("HEE database configuration is invalid: a PostgreSQL DATABASE_URL is required");
  }

  const sslModes = parsed.searchParams.getAll("sslmode");
  if (sslModes.length > 1) {
    throw new Error("HEE database configuration is invalid: DATABASE_URL must contain at most one sslmode parameter");
  }

  const sslMode = sslModes[0]?.trim().toLowerCase();
  if (sslMode && LEGACY_STRICT_SSL_MODES.has(sslMode)) {
    // pg-connection-string currently treats these modes as verify-full, but pg v9
    // will adopt weaker libpq semantics. Preserve HEE's existing certificate and
    // hostname verification explicitly so a future dependency update cannot lower it.
    parsed.searchParams.set("sslmode", "verify-full");
  }

  return parsed.toString();
}
