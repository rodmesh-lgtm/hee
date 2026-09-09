import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const memorySource=fs.readFileSync(path.join(process.cwd(),"app/lib/business-notes/business-memory-ai.ts"),"utf8");
const editorSource=fs.readFileSync(path.join(process.cwd(),"components/dashboard/business-note-voice-textarea.tsx"),"utf8");

test("business memory AI readiness is independent from voice AI",()=>{
  const readiness=memorySource.slice(memorySource.indexOf("export function businessMemoryAiReady"),memorySource.indexOf("function modelName"));
  assert.match(readiness,/INFRO_BUSINESS_MEMORY_AI_ENABLED/);
  assert.doesNotMatch(readiness,/INFRO_BUSINESS_VOICE_AI_ENABLED/);
});

test("memo organizer uses its own readiness instead of voice readiness",()=>{
  assert.match(editorSource,/memoryAiAvailable/);
  assert.match(editorSource,/if\(!memoryAiAvailable\)/);
  assert.match(editorSource,/!memoryAiAvailable\|\|!value\.trim\(\)/);
  assert.match(editorSource,/if\(voiceAvailable\)\{void transcribe/);
});
