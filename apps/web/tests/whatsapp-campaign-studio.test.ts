import assert from "node:assert/strict";
import test from "node:test";
import { campaignTemplateFields, parseCampaignComposition, publicMediaUrl, resolveCampaignComposition } from "../app/lib/whatsapp/campaign-composition";
import { nextCampaignWindow, parseCampaignSendPolicy } from "../app/lib/whatsapp/campaign-send-policy";
import { campaignCsv } from "../app/lib/whatsapp/campaign-report";
import { buildTemplateSubmission } from "../app/lib/whatsapp/template-editor-domain";
import { parseContactImport } from "../app/lib/whatsapp/contact-import";

test("composes recipient-specific positional variables, media, and button suffixes", () => {
  const template = [{ type: "HEADER", format: "IMAGE" }, { type: "BODY", text: "{{2}} {{1}} {{1}}" }, { type: "BUTTONS", buttons: [{ type: "URL", url: "https://ir.sa/{{1}}" }] }];
  const composition = parseCampaignComposition({ mediaUrl: "https://ir.sa/photo.png", bindings: { "body:1": { source: "displayName", value: "" }, "body:2": { source: "attribute", value: "package" }, "button:0": { source: "literal", value: "sada" } } });
  const result = resolveCampaignComposition(template, composition, { displayName: "أحمد", attributes: { package: "صيانة" } });
  assert.deepEqual(result.components, [{ type: "header", parameters: [{ type: "image", image: { link: "https://ir.sa/photo.png" } }] }, { type: "body", parameters: [{ type: "text", text: "أحمد" }, { type: "text", text: "صيانة" }] }, { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "sada" }] }]);
  assert.equal(campaignTemplateFields(template).fields.length, 3);
});
test("named parameters retain their names and missing data fails closed unless fallback supplied", () => {
  const template = [{ type: "BODY", text: "مرحبًا {{customer}}" }];
  const composition = parseCampaignComposition({ bindings: { "body:customer": { source: "displayName", value: "" } } });
  assert.throws(() => resolveCampaignComposition(template, composition, {}), /VARIABLE_MISSING/);
  composition.bindings["body:customer"].fallback = "عميلنا العزيز";
  assert.deepEqual(resolveCampaignComposition(template, composition, {}).components, [{ type: "body", parameters: [{ type: "text", text: "عميلنا العزيز", parameter_name: "customer" }] }]);
  assert.throws(() => resolveCampaignComposition([{ type: "CAROUSEL" }], composition, {}), /UNSUPPORTED/);
});
test("media URLs reject local addresses, credentials, and non-HTTPS schemes", () => {
  for (const url of ["http://ir.sa/a", "https://127.0.0.1/a", "https://[::1]/a", "https://user:password@ir.sa/a", "https://localhost/a", "https://example.internal/a", "javascript:alert(1)"]) assert.equal(publicMediaUrl(url), null);
  assert.throws(() => parseCampaignComposition({ mediaUrl: "http://ir.sa", bindings: {} }), /MEDIA_INVALID/);
  assert.throws(() => parseCampaignComposition({ bindings: { "body:1": { source: "secret", value: "" } } }), /COMPOSITION_INVALID/);
});
test("campaign windows obey Riyadh offset, boundaries, overnight windows, and all-day mode", () => {
  const p = parseCampaignSendPolicy({ perMinute: 20, startHour: 9, endHour: 18, timeZone: "Asia/Riyadh" })!;
  assert.equal(nextCampaignWindow(p, new Date("2026-09-26T05:30:00Z")).toISOString(), "2026-09-26T06:00:00.000Z");
  assert.equal(nextCampaignWindow(p, new Date("2026-09-26T15:00:00Z")).toISOString(), "2026-09-27T06:00:00.000Z");
  const overnight = { ...p, startHour: 22, endHour: 6 };
  assert.equal(nextCampaignWindow(overnight, new Date("2026-09-26T23:30:00Z")).toISOString(), "2026-09-26T23:30:00.000Z");
  assert.equal(nextCampaignWindow(overnight, new Date("2026-09-26T04:00:00Z")).toISOString(), "2026-09-26T19:00:00.000Z");
  assert.throws(() => parseCampaignSendPolicy({ ...p, perMinute: 0 }), /INVALID/);
  assert.throws(() => parseCampaignSendPolicy({ ...p, timeZone: "unknown" }), /INVALID/);
});
test("CSV protects spreadsheet formulas and preserves Arabic and quotes", () => {
  assert.equal(campaignCsv([["=1+1", "+966500000000", "أحمد \"أ\"", "\t@SUM(A1)"]]), '\uFEFF"\'=1+1","\'+966500000000","أحمد ""أ""","\'\t@SUM(A1)"');
});
test("import preserves bounded additional columns without allowing prototype keys", async () => {
  const parsed = await parseContactImport({ format: "csv", data: Buffer.from("phone,name,Package,__proto__\n+966530226628,أحمد,صيانة,value") });
  assert.deepEqual(parsed.rows[0].attributes, { package: "صيانة" });
});
test("template submissions require sequential variables and review examples", () => {
  const input = { name: "welcome_offer", language: "ar", category: "MARKETING", body: "مرحبًا {{1}}", examples: "أحمد", footer: "", header: "NONE", buttonText: "احجز", buttonUrl: "https://ir.sa/sada" };
  assert.equal(buildTemplateSubmission(input).components.length, 2);
  assert.throws(() => buildTemplateSubmission({ ...input, body: "{{2}}" }), /VARIABLES_INVALID/);
  assert.throws(() => buildTemplateSubmission({ ...input, examples: "" }), /EXAMPLES_REQUIRED/);
  assert.throws(() => buildTemplateSubmission({ ...input, header: "IMAGE" }), /SAMPLE_REQUIRED/);
  assert.throws(() => buildTemplateSubmission({ ...input, buttonUrl: "http://localhost" }), /BUTTON_INVALID/);
});
