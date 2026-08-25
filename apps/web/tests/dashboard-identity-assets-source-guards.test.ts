import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/dashboard/identity-assets.tsx", import.meta.url), "utf8");

test("digital identity card and signature report failures in their own panels", () => {
  assert.match(source, /const \[cardError, setCardError\]/);
  assert.match(source, /const \[signatureError, setSignatureError\]/);
  assert.match(source, /setCardError\("تعذر إنشاء البطاقة الآن/);
  assert.match(source, /setSignatureError\("تعذر نسخ التوقيع تلقائيًا/);
  assert.match(source, /\{cardError \? <p role="alert"/);
  assert.match(source, /\{signatureError \? <p role="alert"/);
  assert.doesNotMatch(source, /const \[error, setError\]/);
});
