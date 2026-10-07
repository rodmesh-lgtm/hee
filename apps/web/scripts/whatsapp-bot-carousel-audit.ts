import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../app/lib/db";
import { DEFAULT_BOT_CONFIG } from "../app/lib/whatsapp/bot-domain";
import { answerBotQuestion } from "../app/lib/whatsapp/bot-ai";
import { saveServiceBot, botReplyAllowed } from "../app/lib/whatsapp/bot-store";
import { processNextServiceBotTurn } from "../app/lib/whatsapp/bot-worker";
import { readMetaCatalog, validateMetaCarousel } from "../app/lib/whatsapp/meta-catalog";
import { encryptWhatsAppCredential } from "../app/lib/whatsapp/credential-envelope";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/hee_ci(?:_|$)/.test(url.pathname) || process.env.CI !== "true") throw new Error("CI_DATABASE_REQUIRED");
  // All external requests below are mocked. No real AI or WhatsApp messages are sent.
  const config = { ...DEFAULT_BOT_CONFIG, dailyLimit: 2, rules: [{ question: "ساعات العمل", answer: "من التاسعة إلى الخامسة" }] };
  const aiConfig = { ...config, mode: "ai" as const, knowledge: "معرفة تجريبية معتمدة للمنشأة فقط دون بيانات عملاء أو أوامر تنفيذية." };
  let aiCalls = 0;
  const aiEnv: NodeJS.ProcessEnv = { NODE_ENV: "test", INFRO_WHATSAPP_BOT_AI_ENABLED: "true", INFRO_OPENAI_API_KEY: "test-only", INFRO_WHATSAPP_BOT_MODEL: "test-model" };
  const aiFetch: typeof fetch = async (target, options) => {
    aiCalls++;
    assert.equal(String(target), "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.deepEqual(Object.keys(JSON.parse(body.input)).sort(), ["approvedAnswers", "businessFacts", "customerQuestion"]);
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ reply: "إجابة تجريبية", handoff: false }) }] }] });
  };
  assert.equal((await answerBotQuestion(aiConfig, "ساعات العمل", { env: aiEnv, fetcher: aiFetch })).reply, config.rules[0].answer);
  assert.equal(aiCalls, 0);
  assert.equal((await answerBotQuestion(aiConfig, "أين أجد التفاصيل؟", { env: aiEnv, fetcher: aiFetch })).reply, "إجابة تجريبية");
  assert.equal(aiCalls, 1);
  await assert.rejects(answerBotQuestion(aiConfig, "سؤال آخر", { env: { NODE_ENV: "test" }, fetcher: aiFetch }), /BOT_AI_UNAVAILABLE/);
  await assert.rejects(answerBotQuestion(aiConfig, "سؤال آخر", { env: aiEnv, fetcher: async () => Response.json({ output: [] }) }), /BOT_PROVIDER_OUTPUT_INVALID/);
  const rollback = new Error("ROLLBACK_SUCCESSFUL_AUDIT");
  try {
    await db.$transaction(async tx => {
      const database = new Proxy(tx, { get(target, key) { return key === "$transaction" ? async (fn: (client: Prisma.TransactionClient) => unknown) => fn(tx) : Reflect.get(target, key); } }) as unknown as PrismaClient;
      const nonce = randomUUID(), now = new Date(), before = new Date(now.getTime()-60_000);
      const user = await tx.user.create({ data: { name: "Bot audit", email: `bot-${nonce}@example.test` } });
      const business = await tx.business.create({ data: { ownerId: user.id, name: "Bot audit", slug: `bot-${nonce}`, businessType: "test" } });
      const foreign = await tx.business.create({ data: { ownerId: user.id, name: "Foreign bot audit", slug: `bot-foreign-${nonce}`, businessType: "test" } });
      const plan = await tx.businessPlan.upsert({ where: { code: "BUSINESS" }, update: {}, create: { code: "BUSINESS", name: "Business", monthlyPrice: 100, productLimit: 10 } });
      await tx.subscription.create({ data: { businessId: business.id, planId: plan.id, status: "active", provider: "mock", startsAt: before, endsAt: new Date(now.getTime()+86400000) } });
      const key = Buffer.alloc(32, 7).toString("base64");
      const connection = await tx.whatsAppConnection.create({ data: { businessId: business.id, provider: "meta", status: "connected", marketingEnabled: true, wabaId: "1234567", phoneNumberId: nonce, credentialEnvelope: encryptWhatsAppCredential({ plaintext: "ci-token", encryptionKeyBase64: key, keyVersion: "v1", businessId: business.id }) } });
      await assert.rejects(saveServiceBot({ businessId: foreign.id, userId: user.id, connectionId: connection.id, config, enabled: true, database }), /BOT_CONNECTION_UNAVAILABLE/);
      await saveServiceBot({ businessId: business.id, userId: user.id, connectionId: connection.id, config, enabled: true, database });
      await tx.$executeRaw(Prisma.sql`UPDATE "WhatsAppServiceBot" SET "enabledAt"=${before} WHERE "connectionId"=${connection.id}`);
      const conversation = await tx.whatsAppConversation.create({ data: { businessId: business.id, phoneNumberId: nonce, customerPhoneE164: "+966500000001", lastInboundAt: now, lastMessageAt: now } });
      let order = 0;
      const incoming = (text: string, conversationId = conversation.id) => tx.whatsAppMessage.create({ data: { businessId: business.id, conversationId, provider: "meta", providerMessageId: randomUUID(), direction: "inbound", messageType: "text", status: "received", textBody: text, providerTimestamp: now, createdAt: new Date(now.getTime()+(order++)) } });
      const input = { database, env: { NODE_ENV: "test", WHATSAPP_OUTBOUND_ENABLED: "true" } as NodeJS.ProcessEnv, fetcher: (async () => { throw new Error("UNEXPECTED_NETWORK_REQUEST"); }) as typeof fetch };
      await incoming("ساعات العمل");
      assert.equal((await processNextServiceBotTurn(input)).result, "queued");
      assert.equal((await processNextServiceBotTurn(input)).processed, false);
      const firstJob = await tx.whatsAppReplyJob.findFirstOrThrow({ where: { businessId: business.id } });
      assert.equal(await botReplyAllowed(database, firstJob.id, business.id), true);
      await tx.whatsAppConversation.update({ where: { id: conversation.id }, data: { assignedToUserId: user.id } });
      assert.equal(await botReplyAllowed(database, firstJob.id, business.id), false);
      await tx.whatsAppConversation.update({ where: { id: conversation.id }, data: { assignedToUserId: null } });
      await incoming("ساعات العمل");
      assert.equal(await botReplyAllowed(database, firstJob.id, business.id), false);
      await tx.whatsAppReplyJob.update({ where: { id: firstJob.id }, data: { status: "cancelled" } });
      assert.equal((await processNextServiceBotTurn(input)).result, "queued");
      await incoming("رسالة تتجاوز الحد اليومي");
      assert.equal((await processNextServiceBotTurn(input)).processed, false);
      await saveServiceBot({ businessId: business.id, userId: user.id, connectionId: connection.id, config, enabled: false, database });
      assert.equal(await tx.whatsAppReplyJob.count({ where: { businessId: business.id, status: "queued" } }), 0);
      assert.equal(await botReplyAllowed(database, firstJob.id, business.id), false);
      await saveServiceBot({ businessId: business.id, userId: user.id, connectionId: connection.id, config: { ...config, dailyLimit: 100 }, enabled: true, database });
      await tx.$executeRaw(Prisma.sql`UPDATE "WhatsAppServiceBot" SET "enabledAt"=${before} WHERE "connectionId"=${connection.id}`);
      assert.equal((await processNextServiceBotTurn(input)).result, "handoff");
      const handoffJob = await tx.whatsAppReplyJob.findFirstOrThrow({ where: { businessId: business.id, status: "queued" } });
      assert.equal(await botReplyAllowed(database, handoffJob.id, business.id), true);
      await incoming("ساعات العمل");
      assert.equal((await processNextServiceBotTurn(input)).result, "skipped");
      const second = await tx.whatsAppConversation.create({ data: { businessId: business.id, phoneNumberId: nonce, customerPhoneE164: "+966500000002", lastInboundAt: now, lastMessageAt: now } });
      await tx.whatsAppContact.create({ data: { businessId: business.id, phoneE164: second.customerPhoneE164, source: "manual", optedOutAt: now } });
      await incoming("ساعات العمل", second.id);
      assert.equal((await processNextServiceBotTurn(input)).result, "skipped");
      assert.equal(await tx.whatsAppReplyJob.count({ where: { businessId: foreign.id } }), 0);

      Object.assign(process.env, { META_APP_ID: "1", META_APP_SECRET: "test-only-long-secret", META_BUSINESS_ID: "1", META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: "1", META_WHATSAPP_SYSTEM_USER_ID: "1", META_WHATSAPP_SYSTEM_USER_TOKEN: "test-only-long-system-token", META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: "test-only-long-webhook-verify-token", META_WHATSAPP_GRAPH_VERSION: "v25.0", META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY: key, META_WHATSAPP_CREDENTIAL_KEY_VERSION: "v1", META_WHATSAPP_BILLING_MODE: "customer_meta" });
      const paths: string[] = [];
      const catalogFetch: typeof fetch = async target => { const path = new URL(String(target)).pathname; paths.push(path); return Response.json({ data: path.endsWith("product_catalogs") ? [{ id: "2345678", name: "Test catalog" }] : [{ retailer_id: "A", name: "A" }, { retailer_id: "B", name: "B" }] }); };
      await validateMetaCarousel({ businessId: business.id, connectionId: connection.id, database, fetcher: catalogFetch, selection: { catalogId: "2345678", retailerIds: ["B", "A"] } });
      assert.deepEqual(paths, ["/v25.0/1234567/product_catalogs", "/v25.0/2345678/products"]);
      await assert.rejects(readMetaCatalog({ businessId: foreign.id, connectionId: connection.id, database, fetcher: catalogFetch }), /CATALOG_CONNECTION_UNAVAILABLE/);
      await assert.rejects(validateMetaCarousel({ businessId: business.id, connectionId: connection.id, database, fetcher: catalogFetch, selection: { catalogId: "999", retailerIds: ["A", "B"] } }), /CATALOG_NOT_LINKED/);
      await assert.rejects(validateMetaCarousel({ businessId: business.id, connectionId: connection.id, database, fetcher: catalogFetch, selection: { catalogId: "2345678", retailerIds: ["A", "foreign-sku"] } }), /CATALOG_PRODUCT_NOT_FOUND/);
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("whatsapp-bot-carousel-audit: PASS (SQL lifecycle, tenant isolation, duplicate suppression, budget, handoff, assignment, opt-out, pause, AI contract and catalog ownership; no external requests)");
}
main().finally(() => db.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
