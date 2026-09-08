import { NextResponse } from "next/server";
import { getActiveBusinessForUser } from "../../../lib/active-business";
import { getCurrentUserForApiWrite } from "../../../lib/auth";
import { organizeBusinessMemo } from "../../../lib/business-notes/business-memory-ai";
import { isBusinessVoiceLanguageHint } from "../../../lib/business-notes/voice-ai";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_JSON_BYTES = 24 * 1024;

function json(body: Record<string, unknown>, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) return json({ ok: false, code: "input_too_large" }, 413);

  const user = await getCurrentUserForApiWrite();
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return json({ ok: false, code: "business_required" }, 403);

  try {
    const limit = await consumePublicWriteLimit({
      scope: "business-note-ai-organize",
      businessId: business.id,
      identity: `${user.id}:${requestClientAddress(request)}`,
      limit: 20,
      windowSeconds: 10 * 60,
    });
    if (!limit.allowed) return json({ ok: false, code: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
  } catch {
    return json({ ok: false, code: "rate_limit_unavailable" }, 503);
  }

  let body: unknown;
  try { body = await request.json(); } catch { return json({ ok: false, code: "invalid_json" }, 400); }
  if (!body || typeof body !== "object") return json({ ok: false, code: "invalid_input" }, 400);
  const row = body as Record<string, unknown>;
  const memo = typeof row.memo === "string" ? row.memo.normalize("NFKC").trim() : "";
  const languageHint = typeof row.languageHint === "string" ? row.languageHint : "auto";
  if (!memo || memo.length > 8000) return json({ ok: false, code: "invalid_input" }, 400);
  if (!isBusinessVoiceLanguageHint(languageHint)) return json({ ok: false, code: "invalid_language" }, 400);

  try {
    const suggestion = await organizeBusinessMemo({ memo, languageHint });
    return json({ ok: true, suggestion }, 200);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BUSINESS_MEMORY_AI_PROVIDER_FAILED";
    if (code === "BUSINESS_MEMORY_AI_UNAVAILABLE") return json({ ok: false, code: "ai_unavailable" }, 503);
    if (code === "BUSINESS_MEMORY_AI_INPUT_INVALID") return json({ ok: false, code: "invalid_input" }, 400);
    if (code === "BUSINESS_MEMORY_AI_TIMEOUT") return json({ ok: false, code: "ai_timeout" }, 504);
    if (code === "BUSINESS_MEMORY_AI_INVALID_OUTPUT") return json({ ok: false, code: "ai_invalid_output" }, 502);
    return json({ ok: false, code: "ai_failed" }, 502);
  }
}
