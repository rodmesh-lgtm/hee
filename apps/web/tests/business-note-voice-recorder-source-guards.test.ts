import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../components/dashboard/business-note-voice-textarea.tsx", import.meta.url);

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
  assert.match(source, /جارٍ فتح الميكروفون/);
  assert.match(source, /MICROPHONE_REQUEST_TIMEOUT_MS = 15_000/);
  assert.match(source, /recorder\.start\(750\)/);
  assert.match(source, /if \(voiceAvailable\) \{\s*void transcribe\(blob\)/s);
  assert.match(source, /if \(!voiceAvailable\) startLiveBrowserTranscription\(\)/);
  assert.match(source, /stream\.getTracks\(\)\.forEach/);
  assert.match(source, /type="button" onClick=\{startRecording\}/);
});

test("browser live transcription can recover when server AI is unavailable", async () => {
  const source = await readFile(componentPath, "utf8");
  assert.match(source, /function startLiveBrowserTranscription\(\)/);
  assert.match(source, /webkitSpeechRecognition/);
  assert.match(source, /fallbackTranscriptSeenRef/);
  assert.match(source, /تم تحويل الكلام إلى نص عبر المتصفح/);
});
