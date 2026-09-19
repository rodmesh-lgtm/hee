import assert from "node:assert/strict";
import test from "node:test";

import { bookingConfirmationTemplateSupportsParameters, buildBookingConfirmationTemplateParameters } from "../app/lib/whatsapp/booking-confirmation-domain";

test("booking confirmation accepts only the exact seven positional variables in the body", () => {
  assert.equal(bookingConfirmationTemplateSupportsParameters([{ type: "BODY", text: "{{1}} {{2}} {{3}} {{4}} {{5}} {{6}} {{7}}" }], "POSITIONAL"), true);
  assert.equal(bookingConfirmationTemplateSupportsParameters([{ type: "BODY", text: "{{1}} {{2}} {{3}} {{4}} {{5}} {{6}}" }], "POSITIONAL"), false);
  assert.equal(bookingConfirmationTemplateSupportsParameters([{ type: "BODY", text: "{{1}} {{2}} {{3}} {{4}} {{5}} {{6}} {{7}} {{8}}" }], "POSITIONAL"), false);
  assert.equal(bookingConfirmationTemplateSupportsParameters([{ type: "BODY", text: "{{business}} {{2}} {{3}} {{4}} {{5}} {{6}} {{7}}" }], "NAMED"), false);
});

test("booking confirmation parameters preserve the agreed business, service, branch, date, time and reference order", () => {
  const result = buildBookingConfirmationTemplateParameters({
    businessName: "مركز INFRO",
    serviceName: "موعد صيانة",
    branchName: "فرع جدة",
    bookingDate: "2026-09-21",
    bookingTime: "08:00",
    slotEndTime: "10:00",
    bookingId: "123e4567-e89b-12d3-a456-426614174000",
  });
  assert.equal(result[0].type, "body");
  assert.equal(result[0].parameters.length, 7);
  assert.deepEqual(result[0].parameters.slice(0, 3).map((item) => item.text), ["مركز INFRO", "موعد صيانة", "فرع جدة"]);
  assert.equal(result[0].parameters[6].text, "123E4567");
});
