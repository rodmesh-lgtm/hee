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
  assert.match(body, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(body, /new MediaRecorder/);
  assert.doesNotMatch(body, /if\s*\(\s*!voiceAvailable\s*\)\s*\{?\s*startBrowserFallback/);
});

test("AI readiness is checked only after a real recording is captured", async () => {
  const source = await readFile(componentPath, "utf8");
  assert.match(source, /if\(blob\.size>0\)\{if\(voiceAvailable\)void transcribe\(blob\)/);
  assert.match(source, /stream\.getTracks\(\)\.forEach/);
  assert.match(source, /type=\"button\" onClick=\{startRecording\}/);
});
