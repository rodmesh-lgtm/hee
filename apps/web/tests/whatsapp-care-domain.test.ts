import assert from "node:assert/strict";
import test from "node:test";
import { whatsAppCareSlaDueAt, whatsAppCareSlaState } from "../app/lib/whatsapp/care-domain";

const inboundAt = new Date("2026-09-20T10:00:00.000Z");

test("care SLA deadlines follow the declared priority contract", () => {
  assert.equal(whatsAppCareSlaDueAt("urgent", inboundAt).toISOString(), "2026-09-20T10:15:00.000Z");
  assert.equal(whatsAppCareSlaDueAt("high", inboundAt).toISOString(), "2026-09-20T11:00:00.000Z");
  assert.equal(whatsAppCareSlaDueAt("normal", inboundAt).toISOString(), "2026-09-20T14:00:00.000Z");
  assert.equal(whatsAppCareSlaDueAt("low", inboundAt).toISOString(), "2026-09-20T18:00:00.000Z");
  assert.equal(whatsAppCareSlaDueAt("unexpected", inboundAt).toISOString(), "2026-09-20T14:00:00.000Z");
});

test("care SLA is overdue only while the latest inbound still awaits a reply", () => {
  assert.deepEqual(whatsAppCareSlaState({ lastInboundAt: inboundAt, lastOutboundAt: null, slaDueAt: new Date("2026-09-20T10:15:00.000Z"), slaRespondedAt: null, now: new Date("2026-09-20T10:16:00.000Z") }).state, "overdue");
  assert.deepEqual(whatsAppCareSlaState({ lastInboundAt: inboundAt, lastOutboundAt: new Date("2026-09-20T10:05:00.000Z"), slaDueAt: new Date("2026-09-20T10:15:00.000Z"), slaRespondedAt: new Date("2026-09-20T10:05:00.000Z"), now: new Date("2026-09-20T10:16:00.000Z") }).state, "answered");
});
