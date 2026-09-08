import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../components/dashboard/business-note-voice-textarea.tsx", import.meta.url);
const nextConfigPath = new URL("../next.config.ts", import.meta.url);

function compact(source: string) {
  return source.replace(/\s+/g, "");
}

test("voice recorder requests the microphone independently of AI readiness", async () => {
  const source = await readFile(componentPath, "utf8");
  const start = source.indexOf("async function startRecording()");
  const stop = source.indexOf("function stopRecording()", start);
  assert.ok(start >= 0 && stop > start, "startRecording must exist");
  const body = source.slice(start, stop);
  assert.match(source, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(body, /microphoneStreamWithTimeout\(\)/);
  assert.match(body, /new MediaRecorder/);
  assert.doesNotMatch(body, /if\s*\(\s*!voiceAvailable\s*\)\s*\{?\s*startBrowserFallback/);
});

test("recorder visibly reports microphone acquisition and records before AI branching", async () => {
  const source = await readFile(componentPath, "utf8");
  const normalized = compact(source);
  assert.match(source, /جارٍ فتح الميكروفون/);
  assert.match(source, /MICROPHONE_REQUEST_TIMEOUT_MS\s*=\s*15_000/);
  assert.ok(/(?:recorder|r)\.start\(750\)/.test(normalized), "MediaRecorder must start with the guarded 750ms chunk interval");
  const blobIndex = normalized.indexOf("newBlob(");
  const aiBranchIndex = normalized.indexOf("if(voiceAvailable){voidtranscribe(");
  assert.ok(blobIndex >= 0 && aiBranchIndex > blobIndex, "server transcription must branch only after the captured blob exists");
  assert.ok(normalized.includes("if(!voiceAvailable)startLiveBrowserTranscription()"), "browser transcription fallback must start only when server voice AI is unavailable");
  assert.match(normalized, /(?:stream|s)\.getTracks\(\)\.forEach/);
  assert.ok(normalized.includes('type="button"onClick={startRecording}'), "recording must remain an explicit user action");
});

test("browser live transcription can recover when server AI is unavailable", async () => {
  const source = await readFile(componentPath, "utf8");
  assert.match(source, /function startLiveBrowserTranscription\(\)/);
  assert.match(source, /webkitSpeechRecognition/);
  assert.match(source, /fallbackTranscriptSeenRef/);
  assert.match(source, /تم تحويل الكلام إلى نص عبر المتصفح/);
});

test("microphone permission is denied globally and opened only for business notes", async () => {
  const source = await readFile(nextConfigPath, "utf8");
  assert.match(source, /defaultPermissionsPolicy = "camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)"/);
  assert.match(source, /businessNotesPermissionsPolicy = "camera=\(\), microphone=\(self\), geolocation=\(\), payment=\(\)"/);
  assert.match(source, /source: "\/dashboard\/notes\/:path\*"/);
  assert.match(source, /value: businessNotesPermissionsPolicy/);
});
