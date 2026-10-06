// Deliberately classify failures without exposing database URLs, provider payloads,
// contact data or arbitrary exception messages in responses and runtime logs.
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
