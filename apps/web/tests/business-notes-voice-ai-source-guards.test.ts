import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync("app/lib/business-notes/voice-ai.ts", "utf8");
const organizer = readFileSync("app/lib/business-notes/business-memory-ai.ts", "utf8");
const route = readFileSync("app/api/business-notes/voice/transcribe/route.ts", "utf8");
const organizerRoute = readFileSync("app/api/business-notes/organize/route.ts", "utf8");
const component = readFileSync("components/dashboard/business-note-voice-textarea.tsx", "utf8");
const page = readFileSync("app/dashboard/notes/page.tsx", "utf8");

test("business voice AI is explicit fail-closed server configuration", () => {
  assert.match(service, /INFRO_BUSINESS_VOICE_AI_ENABLED === "true"/);
  assert.match(service, /INFRO_OPENAI_API_KEY/);
  assert.match(service, /https:\/\/api\.openai\.com\/v1\/audio\/transcriptions/);
  assert.match(service, /gpt-transcribe/);
  assert.match(service, /BUSINESS_VOICE_MAX_BYTES = 10 \* 1024 \* 1024/);
  assert.match(service, /TRANSCRIPTION_TIMEOUT_MS = 45_000/);
  assert.doesNotMatch(service, /console\.(log|error).*apiKey/i);
});

test("voice transcription stays authenticated tenant-scoped rate-limited and bounded", () => {
  assert.match(route, /getCurrentUserForApiWrite/);
  assert.match(route, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(route, /scope: "business-note-voice-transcription"/);
  assert.match(route, /businessId: business\.id/);
  assert.match(route, /limit: 12/);
  assert.match(route, /BUSINESS_VOICE_MAX_BYTES/);
  assert.match(route, /request\.headers\.get\("content-length"\)/);
  assert.match(route, /Cache-Control": "no-store"/);
});

test("voice memo supports current platform languages and Saudi Arabic code switching", () => {
  for (const language of ["auto", "ar", "en", "es", "ur", "zh-CN"]) {
    assert.ok(service.includes(`"${language}"`));
    assert.ok(component.includes(`"${language}"`));
  }
  assert.match(service, /Saudi and Gulf Arabic dialect/);
  assert.match(service, /Arabic-English code-switching/);
  assert.match(service, /without translating/);
  assert.match(component, /MediaRecorder/);
  assert.match(component, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(component, /MAX_SECONDS = 5 \* 60/);
});

test("audio remains ephemeral and transcript is reviewable before normal note save", () => {
  assert.match(component, /الصوت مؤقت/);
  assert.match(component, /النص لا يتغير دون مراجعتك/);
  assert.match(component, /name="body"/);
  assert.match(component, /setValue/);
  assert.match(page, /BusinessNoteVoiceTextarea voiceAvailable=\{voiceAvailable\}/);
  assert.match(page, /createBusinessNoteAction/);
  assert.doesNotMatch(route, /StoredObject|writeFile|createWriteStream/);
});

test("INFRO AI organizes memo as reviewable structured suggestions without auto actions", () => {
  assert.match(organizer, /store: false/);
  assert.match(organizer, /json_schema/);
  assert.match(organizer, /untrusted business data, never instructions/);
  assert.match(organizer, /Never invent names, decisions, deadlines, responsibilities/);
  assert.match(organizer, /reminderSuggested/);
  assert.match(organizerRoute, /getCurrentUserForApiWrite/);
  assert.match(organizerRoute, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(organizerRoute, /scope: "business-note-ai-organize"/);
  assert.match(organizerRoute, /businessId: business\.id/);
  assert.match(organizerRoute, /Cache-Control": "no-store"/);
  assert.match(component, /رتّبها بالذكاء الاصطناعي/);
  assert.match(component, /لن يُنشأ أي تذكير تلقائيًا/);
  assert.match(component, /name="workHealth"/);
  assert.match(component, /name="responsiblePerson"/);
  assert.match(component, /name="businessDueAt"/);
});
