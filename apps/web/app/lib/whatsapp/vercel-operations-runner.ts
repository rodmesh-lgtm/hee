import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "../db";
import { processNextSmartReminderDelivery } from "../reminders/delivery-worker";
import { runSmartReminderScheduler } from "../reminders/scheduler";
import { processNextWhatsAppAutomationDelivery } from "./automation-delivery-worker";
import { processNextWhatsAppAutomationEvent } from "./automation-processor";
import { scheduleInactiveCustomerAutomationEvents } from "./automation-scheduler";
import { reconcileWhatsAppCampaignCompletion } from "./campaign-operations";
import { processNextContactImportBatch } from "./contact-import-processor";
import { processNextWhatsAppDelivery } from "./delivery-worker";
import { enqueueWhatsAppCampaign } from "./delivery-queue";
import type { WHATSAPP_OPERATION_STAGES } from "./operations-worker";
import { processNextWhatsAppReply } from "./reply-worker";
import { detectNextAbandonedShopifyCart } from "./shopify-abandoned-cart-detector";
import { processNextShopifyWebhookEvent } from "./shopify-webhook-processor";
import { processNextShopifyWebhookSubscriptionSync } from "./shopify-webhook-subscriptions";
import { processNextWhatsAppWebhookEvent } from "./webhook-processor";

type StageName = (typeof WHATSAPP_OPERATION_STAGES)[number];

function boundedBatch(env: NodeJS.ProcessEnv, name: string, fallback: number, maximum: number) {
  const requested = Number(env[name] ?? fallback);
  return Number.isInteger(requested) && requested > 0 ? Math.min(requested, maximum) : fallback;
}

async function runContactImports(env: NodeJS.ProcessEnv) {
  const workerId = `vercel-contact-import-${randomUUID()}`;
  const batchSize = boundedBatch(env, "WHATSAPP_CONTACT_IMPORT_BATCH_SIZE", 20, 100);
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextContactImportBatch({ workerId });
    if (result.processed || ("retryScheduled" in result && result.retryScheduled)) continue;
    if ("error" in result && result.error) throw new Error("WHATSAPP_CONTACT_IMPORT_FAILED");
    break;
  }
}

async function runWebhooks(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_WEBHOOK_BATCH_SIZE", 100, 500);
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextWhatsAppWebhookEvent();
    if (result.processed) continue;
    if ("error" in result && result.error) throw new Error("WHATSAPP_WEBHOOK_FAILED");
    break;
  }
}

async function runShopifySubscriptions(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_SHOPIFY_SUBSCRIPTION_BATCH_SIZE", 25, 100);
  const workerId = `vercel-shopify-subscriptions-${randomUUID()}`;
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextShopifyWebhookSubscriptionSync({ workerId });
    if (!result.processed) break;
  }
}

async function runShopifyWebhooks(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_SHOPIFY_WEBHOOK_BATCH_SIZE", 100, 500);
  const workerId = `vercel-shopify-${randomUUID()}`;
  for (let index = 0; index < batchSize; index += 1) {
    const result = await processNextShopifyWebhookEvent({ workerId });
    if (!result.processed) break;
  }
}

async function runAbandonedCarts(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_SHOPIFY_ABANDONED_CART_BATCH_SIZE", 100, 500);
  for (let index = 0; index < batchSize; index += 1) {
    const result = await detectNextAbandonedShopifyCart();
    if (!result.processed) break;
  }
}

async function runCampaigns(env: NodeJS.ProcessEnv) {
  const now = new Date();
  const batchSize = boundedBatch(env, "WHATSAPP_CAMPAIGN_BATCH_SIZE", 100, 200);
  const [due, active] = await Promise.all([
    db.whatsAppCampaign.findMany({ where: { status: "scheduled", scheduledAt: { lte: now } }, select: { id: true, businessId: true }, orderBy: { scheduledAt: "asc" }, take: batchSize }),
    db.whatsAppCampaign.findMany({ where: { status: { in: ["running", "paused"] } }, select: { id: true, businessId: true }, take: batchSize }),
  ]);
  let failed = false;
  for (const campaign of due) {
    try { await enqueueWhatsAppCampaign({ businessId: campaign.businessId, campaignId: campaign.id, now }); } catch { failed = true; }
  }
  for (const campaign of active) await reconcileWhatsAppCampaignCompletion({ businessId: campaign.businessId, campaignId: campaign.id, now });
  if (failed) throw new Error("WHATSAPP_CAMPAIGN_FAILED");
}

async function runDeliveries(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_DELIVERY_BATCH_SIZE", 100, 500);
  for (let index = 0; index < batchSize; index += 1) { const result = await processNextWhatsAppDelivery(); if (!result.processed) break; }
}

async function runReplies(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_REPLY_BATCH_SIZE", 100, 500);
  for (let index = 0; index < batchSize; index += 1) { const result = await processNextWhatsAppReply(); if (!result.processed) break; }
}

async function runAutomations(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_AUTOMATION_BATCH_SIZE", 50, 200);
  const workerId = `vercel-automation-${randomUUID()}`;
  for (let index = 0; index < batchSize; index += 1) { const result = await processNextWhatsAppAutomationEvent({ workerId }); if (!result.processed && "empty" in result && result.empty) break; }
}

async function runAutomationDeliveries(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_AUTOMATION_DELIVERY_BATCH_SIZE", 100, 500);
  const workerId = `vercel-automation-delivery-${randomUUID()}`;
  for (let index = 0; index < batchSize; index += 1) { const result = await processNextWhatsAppAutomationDelivery({ workerId }); if (!result.processed) break; }
}

async function runReminderSchedules(env: NodeJS.ProcessEnv) {
  await runSmartReminderScheduler({ limit: boundedBatch(env, "WHATSAPP_REMINDER_SCHEDULE_BATCH_SIZE", 100, 500) });
}

async function runReminderDeliveries(env: NodeJS.ProcessEnv) {
  const batchSize = boundedBatch(env, "WHATSAPP_REMINDER_DELIVERY_BATCH_SIZE", 100, 500);
  const workerId = `vercel-reminder-delivery-${randomUUID()}`;
  for (let index = 0; index < batchSize; index += 1) { const result = await processNextSmartReminderDelivery({ workerId }); if (!result.processed) break; }
}

export async function runVercelWhatsAppStage(stage: StageName, env: NodeJS.ProcessEnv) {
  switch (stage) {
    case "whatsapp:contact-imports": return runContactImports(env);
    case "whatsapp:webhooks": return runWebhooks(env);
    case "whatsapp:shopify-subscriptions": return runShopifySubscriptions(env);
    case "whatsapp:shopify-webhooks": return runShopifyWebhooks(env);
    case "whatsapp:shopify-abandoned-carts": return runAbandonedCarts(env);
    case "whatsapp:campaigns": return runCampaigns(env);
    case "whatsapp:deliveries": return runDeliveries(env);
    case "whatsapp:replies": return runReplies(env);
    case "whatsapp:automation-schedules": await scheduleInactiveCustomerAutomationEvents(); return;
    case "whatsapp:automations": return runAutomations(env);
    case "whatsapp:automation-deliveries": return runAutomationDeliveries(env);
    case "whatsapp:reminder-schedules": return runReminderSchedules(env);
    case "whatsapp:reminder-deliveries": return runReminderDeliveries(env);
  }
}
