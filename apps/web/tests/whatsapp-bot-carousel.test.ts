import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_BOT_CONFIG, botOptOut, botRequestedHandoff, parseBotAnswer, parseBotConfig, ruleBotReply } from "../app/lib/whatsapp/bot-domain";
import { parseProductCarousel, productCarouselParameters, productCarouselTemplateComponent } from "../app/lib/whatsapp/product-carousel";
import { campaignTemplateFields, parseCampaignComposition, resolveCampaignComposition } from "../app/lib/whatsapp/campaign-composition";

test("Arabic FAQ matching and human handoff take priority over configured answers", () => {
  const config = parseBotConfig({ ...DEFAULT_BOT_CONFIG, rules: [{ question: "أينَ الفرع؟", answer: "في الرياض" }, { question: "اريد موظف", answer: "لا تحول" }] });
  assert.equal(ruleBotReply(config, "اين الفرع")?.reply, "في الرياض");
  assert.equal(ruleBotReply(config, "اريد موظف")?.handoff, true);
  assert.equal(ruleBotReply(config, "كم سعر منتج غير معروف")?.reply, config.handoffText);
  assert.equal(botOptOut("إيقاف"), true);
  assert.equal(botRequestedHandoff("human please"), true);
  assert.throws(() => parseBotConfig({ ...config, dailyLimit: 101 }));
  assert.throws(() => parseBotConfig({ ...config, rules: [...config.rules, { question: "اين الفرع", answer: "duplicate" }] }));
  assert.throws(() => parseBotConfig({ ...config, mode: "ai", knowledge: "" }));
});
test("structured answer rejects malformed data and never uses generated handoff promises", () => {
  assert.deepEqual(parseBotAnswer({ reply: "سأعيد المبلغ", handoff: true }, "تحويل للفريق"), { reply: "تحويل للفريق", handoff: true });
  for (const answer of [null, { reply: "", handoff: false }, { reply: "x", handoff: "false" }, { reply: "x".repeat(2001), handoff: false }]) assert.throws(() => parseBotAnswer(answer, "فريق"));
});
test("product cards produce native Meta headers with ordered zero-based indexes", () => {
  const template = [{ type: "BODY", text: "مرحبًا {{1}}" }, productCarouselTemplateComponent()];
  assert.equal(campaignTemplateFields(template).unsupported, false);
  const composition = parseCampaignComposition({ bindings: { "body:1": { source: "displayName", value: "" } }, productCarousel: { catalogId: "12345", retailerIds: ["SKU-B", "SKU-A"] } });
  const result = resolveCampaignComposition(template, composition, { displayName: "أحمد" });
  assert.deepEqual(result.components[1], { type: "carousel", cards: ["SKU-B", "SKU-A"].map((id, index) => ({ card_index: index, components: [{ type: "header", parameters: [{ type: "product", product: { catalog_id: "12345", product_retailer_id: id } }] }] })) });
  assert.equal(productCarouselParameters({ catalogId: "123", retailerIds: Array.from({ length: 10 }, (_, i) => `SKU-${i}`) }).cards.length, 10);
});
test("carousel rejects missing products, duplicate SKUs and unsupported card structures", () => {
  for (const retailerIds of [[], ["a"], ["a", "a"], Array.from({ length: 11 }, (_, i) => String(i)), ["a", "\nsecret"]]) assert.throws(() => parseProductCarousel({ catalogId: "123", retailerIds }));
  assert.throws(() => parseProductCarousel({ catalogId: "https://evil.test", retailerIds: ["a", "b"] }));
  assert.throws(() => resolveCampaignComposition([productCarouselTemplateComponent()], { bindings: {} }, {}));
  assert.throws(() => resolveCampaignComposition([{ type: "BODY", text: "hello" }], { bindings: {}, productCarousel: { catalogId: "123", retailerIds: ["a", "b"] } }, {}));
  assert.equal(campaignTemplateFields([{ type: "CAROUSEL", cards: [{ components: [{ type: "HEADER", format: "IMAGE" }] }] }]).unsupported, true);
  assert.equal(campaignTemplateFields([productCarouselTemplateComponent(), productCarouselTemplateComponent()]).unsupported, true);
});
