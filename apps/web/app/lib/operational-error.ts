// Deliberately classify failures without exposing database URLs, provider payloads,
// contact data or arbitrary exception messages in responses and runtime logs.
/** Bounded diagnostic codes only: never return an arbitrary error message or SQL. */
export function operationalErrorCode(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") break;
    const item = current as { code?: unknown; message?: unknown; meta?: unknown; cause?: unknown };
    const meta = item.meta && typeof item.meta === "object" ? item.meta as { code?: unknown } : null;
    if (typeof meta?.code === "string" && /^[0-9][0-9A-Z]{4}$/.test(meta.code)) return `SQLSTATE_${meta.code}`;
    if (typeof item.code === "string" && (/^P\d{4}$/.test(item.code) || /^[0-9][0-9A-Z]{4}$/.test(item.code) || ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE"].includes(item.code))) return item.code;
    if (typeof item.message === "string" && /^(WHATSAPP|INFRO_REMINDER)_[A-Z0-9_]{1,96}$/.test(item.message)) return item.message;
    current = item.cause;
  }
  return "UNCLASSIFIED";
}

export function operationalErrorCategory(error: unknown): "database_timeout" | "database_connection" | "database_schema" | "unknown" {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") break;
    const item = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (item.code === "P2024" || item.code === "ETIMEDOUT" || item.message === "Connection terminated due to connection timeout" || item.message === "timeout exceeded when trying to connect") return "database_timeout";
    if (["P1001", "P1017", "ECONNRESET", "ECONNREFUSED", "EPIPE", "08006", "08001", "57P01"].includes(String(item.code ?? "")) || item.message === "Connection terminated unexpectedly") return "database_connection";
    if (["P2021", "P2022", "42P01", "42703"].includes(String(item.code ?? ""))) return "database_schema";
    current = item.cause;
  }
  return "unknown";
}
