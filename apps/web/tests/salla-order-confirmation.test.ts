import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { sallaOrderTemplateParameters, sallaOrderTemplateSupported } from "../app/lib/whatsapp/salla-order-confirmation-domain";

const source = (file: string) => readFileSync(new URL(`../app/lib/${file}`, import.meta.url), "utf8");

test("Salla confirmation accepts only the three positional body variables", () => {
  assert.equal(sallaOrderTemplateSupported([{ type: "BODY", text: "مرحبًا {{1}}، طلبك {{3}} من {{2}} مؤكد." }], "POSITIONAL"), true);
  assert.equal(sallaOrderTemplateSupported([{ type: "BODY", text: "{{1}} {{2}} {{3}} {{4}}" }], "POSITIONAL"), false);
  assert.equal(sallaOrderTemplateSupported([{ type: "BODY", text: "{{1}} {{2}} {{2}}" }], "POSITIONAL"), false);
  assert.equal(sallaOrderTemplateSupported([{ type: "BODY", text: "{{1}} {{2}} {{3}}" }], "NAMED"), false);
  assert.equal(sallaOrderTemplateSupported([{ type: "BODY", text: "{{1}} {{2}} {{3}}" }, { type: "HEADER", format: "IMAGE" }]), false);
});

test("customer, business and order populate approved template in the agreed order", () => {
  assert.deepEqual(sallaOrderTemplateParameters("  أحمد   محمد ", "صدى المراكب", "123")[0].parameters.map(parameter => parameter.text), ["أحمد محمد", "صدى المراكب", "123"]);
  assert.equal(sallaOrderTemplateParameters(null, "صدى المراكب", "123")[0].parameters[0].text, "عميلنا العزيز");
});

test("signed live webhook alone enqueues after consent and activation, with order rechecks before delivery", () => {
  const ingress = source("commerce/salla-webhook-processor.ts");
  const enqueue = source("commerce/salla-order-confirmation.ts");
  const processing = source("whatsapp/automation-processor.ts");
  const delivery = source("whatsapp/automation-delivery-worker.ts");
  assert.match(ingress, /mapping\.order\.eligible && !current\?\.eligible/);
  assert.match(ingress, /enqueueSallaOrderConfirmation/);
  assert.match(enqueue, /consentedAt: \{ lte: input\.receivedAt \}/);
  assert.match(enqueue, /activatedAt: \{ lte: input\.receivedAt \}/);
  assert.match(enqueue, /if \(contact\.optedOutAt\) return/);
  assert.match(enqueue, /externalEventId: `\$\{input\.eligibilityId\}:\$\{automation\.id\}`/);
  for (const worker of [processing, delivery]) {
    assert.match(worker, /provider: "salla", eligible: true/);
    assert.match(worker, /phoneE164: (?:contact|context\.contact)\.phoneE164/);
    assert.match(worker, /integration: \{ businessId: (?:event|job)\.businessId, provider: "salla", status: "active" \}/);
  }
});
