import "server-only";

const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-transcribe";
const MAX_MODEL_NAME_LENGTH = 80;
const TRANSCRIPTION_TIMEOUT_MS = 45_000;

export const BUSINESS_VOICE_MAX_BYTES = 10 * 1024 * 1024;
export const BUSINESS_VOICE_MAX_SECONDS = 5 * 60;
export const BUSINESS_VOICE_LANGUAGE_HINTS = ["auto", "ar", "en", "es", "ur", "zh-CN"] as const;
export type BusinessVoiceLanguageHint = (typeof BUSINESS_VOICE_LANGUAGE_HINTS)[number];

const ALLOWED_AUDIO_MIME_PREFIXES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "video/webm",
  "video/mp4",
] as const;

export function isBusinessVoiceLanguageHint(value: string): value is BusinessVoiceLanguageHint {
  return (BUSINESS_VOICE_LANGUAGE_HINTS as readonly string[]).includes(value);
}

function openAiApiKey() {
  return process.env.INFRO_OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
}

export function businessVoiceAiReady() {
  const enabled = process.env.INFRO_BUSINESS_VOICE_AI_ENABLED;
  if (enabled === "false") return false;
  return Boolean(openAiApiKey());
}

export function isAllowedBusinessVoiceMime(value: string) {
  const normalized = value.toLowerCase().split(";")[0]?.trim() ?? "";
  return ALLOWED_AUDIO_MIME_PREFIXES.includes(normalized as (typeof ALLOWED_AUDIO_MIME_PREFIXES)[number]);
}

function modelName() {
  const configured = process.env.INFRO_VOICE_TRANSCRIPTION_MODEL?.trim();
  if (!configured) return DEFAULT_TRANSCRIPTION_MODEL;
  if (configured.length > MAX_MODEL_NAME_LENGTH || !/^[a-zA-Z0-9._:-]+$/.test(configured)) return DEFAULT_TRANSCRIPTION_MODEL;
  return configured;
}

function providerLanguage(hint: BusinessVoiceLanguageHint) {
  if (hint === "auto") return null;
  if (hint === "zh-CN") return "zh";
  return hint;
}

function transcriptionContext(hint: BusinessVoiceLanguageHint) {
  if (hint === "ar" || hint === "auto") {
    return "INFRO business memo. Transcribe faithfully without translating. Preserve Saudi and Gulf Arabic dialect, Arabic-English code-switching, company and person names, amounts, dates, PO, quotation, invoice, VAT, CR, SAR, and business terminology. Use clear punctuation but do not summarize or invent details.";
  }
  return "INFRO business memo. Transcribe faithfully without translating. Preserve names, amounts, dates, acronyms, and business terminology. Use clear punctuation but do not summarize or invent details.";
}

export async function transcribeBusinessVoice(input: { file: File; languageHint: BusinessVoiceLanguageHint }) {
  if (!businessVoiceAiReady()) throw new Error("BUSINESS_VOICE_AI_UNAVAILABLE");
  if (input.file.size <= 0 || input.file.size > BUSINESS_VOICE_MAX_BYTES) throw new Error("BUSINESS_VOICE_FILE_SIZE_INVALID");
  if (!isAllowedBusinessVoiceMime(input.file.type)) throw new Error("BUSINESS_VOICE_FILE_TYPE_INVALID");

  const apiKey = openAiApiKey();
  const payload = new FormData();
  payload.set("model", modelName());
  payload.set("file", input.file, input.file.name || "business-note.webm");
  payload.set("prompt", transcriptionContext(input.languageHint));
  const language = providerLanguage(input.languageHint);
  if (language) payload.set("language", language);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: payload,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("BUSINESS_VOICE_PROVIDER_FAILED");
    const data = (await response.json()) as { text?: unknown };
    const text = typeof data.text === "string" ? data.text.normalize("NFKC").trim() : "";
    if (!text) throw new Error("BUSINESS_VOICE_EMPTY_TRANSCRIPT");
    return text.slice(0, 8000);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("BUSINESS_VOICE_PROVIDER_TIMEOUT");
    if (error instanceof Error && error.message.startsWith("BUSINESS_VOICE_")) throw error;
    throw new Error("BUSINESS_VOICE_PROVIDER_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
