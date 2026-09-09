import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/dashboard/whatsapp/insights/page.tsx", "utf8");

test("WhatsApp insights keeps every reporting source tenant scoped", () => {
  assert.match(source, /campaign\."businessId" = \$\{context\.businessId\}/);
  assert.match(source, /recipient\."businessId" = campaign\."businessId"/);
  assert.match(source, /businessId: context\.businessId/g);
  assert.match(source, /contact\."businessId" = \$\{context\.businessId\}/);
  assert.match(source, /consent\."businessId" = contact\."businessId"/);
  assert.match(source, /recipient\."businessId" = \$\{context\.businessId\}/);
});

test("reporting window is finite and selected from a strict allowlist", () => {
  assert.match(source, /allowedWindows = \[7, 30, 90\] as const/);
  assert.match(source, /allowedWindows\.includes\(requestedWindow as ReportWindow\)/);
  assert.match(source, /LIMIT 100/);
  assert.match(source, /LIMIT 90/);
});

test("insights derives delivery and audience truth from stored lifecycle state", () => {
  assert.match(source, /'sent','delivered','read'/);
  assert.match(source, /'delivered','read'/);
  assert.match(source, /recipient\."status" = 'read'/);
  assert.match(source, /contact\."optedOutAt" IS NULL/);
  assert.match(source, /consent\."revokedAt" IS NULL/);
  assert.match(source, /consent\."consentedAt" <= CURRENT_TIMESTAMP/);
  assert.match(source, /consent\."phoneE164" = contact\."phoneE164"/);
});

test("insights avoids unsupported revenue attribution and customer-private payloads", () => {
  assert.match(source, /لا نعرض إيرادًا أو تحويلًا ما لم يوجد له إسناد حقيقي/);
  assert.doesNotMatch(source, /textBody|credentialEnvelope|rawPayload|payload:/);
  assert.doesNotMatch(source, /phoneE164\s*:/);
  assert.doesNotMatch(source, /\{(?:contact|recipient)\.phoneE164\}/);
  assert.match(source, /لا تعرض نصوص الرسائل أو أرقام العملاء أو أي بيانات اعتماد/);
});
