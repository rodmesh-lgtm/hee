import { NextResponse } from "next/server";
import { getActiveBusinessForUser } from "../../../../lib/active-business";
import { getCurrentUserForApiWrite } from "../../../../lib/auth";
import { BUSINESS_VOICE_MAX_BYTES, isBusinessVoiceLanguageHint, transcribeBusinessVoice } from "../../../../lib/business-notes/voice-ai";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MULTIPART_OVERHEAD_BYTES = 512 * 1024;

function json(body: Record<string, unknown>, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > BUSINESS_VOICE_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return json({ ok: false, code: "file_too_large" }, 413);
  }

  const user = await getCurrentUserForApiWrite();
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return json({ ok: false, code: "business_required" }, 403);

  try {
    const limit = await consumePublicWriteLimit({
      scope: "business-note-voice-transcription",
      businessId: business.id,
      identity: `${user.id}:${requestClientAddress(request)}`,
      limit: 12,
      windowSeconds: 10 * 60,
    });
    if (!limit.allowed) {
      return json({ ok: false, code: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }
  } catch {
    return json({ ok: false, code: "rate_limit_unavailable" }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, code: "invalid_form" }, 400);
  }

  const file = form.get("audio");
  const languageHint = String(form.get("languageHint") ?? "auto");
  if (!(file instanceof File) || file.size <= 0 || file.size > BUSINESS_VOICE_MAX_BYTES) {
    return json({ ok: false, code: "invalid_audio" }, file instanceof File && file.size > BUSINESS_VOICE_MAX_BYTES ? 413 : 400);
  }
  if (!isBusinessVoiceLanguageHint(languageHint)) return json({ ok: false, code: "invalid_language" }, 400);

  try {
    const text = await transcribeBusinessVoice({ file, languageHint });
    return json({ ok: true, text }, 200);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BUSINESS_VOICE_PROVIDER_FAILED";
    if (code === "BUSINESS_VOICE_AI_UNAVAILABLE") return json({ ok: false, code: "voice_unavailable" }, 503);
    if (code === "BUSINESS_VOICE_FILE_SIZE_INVALID") return json({ ok: false, code: "invalid_audio" }, 413);
    if (code === "BUSINESS_VOICE_FILE_TYPE_INVALID") return json({ ok: false, code: "unsupported_audio" }, 415);
    if (code === "BUSINESS_VOICE_PROVIDER_TIMEOUT") return json({ ok: false, code: "transcription_timeout" }, 504);
    if (code === "BUSINESS_VOICE_EMPTY_TRANSCRIPT") return json({ ok: false, code: "empty_transcript" }, 422);
    return json({ ok: false, code: "transcription_failed" }, 502);
  }
}
