import { db } from "../app/lib/db";
import { processNextWhatsAppReply } from "../app/lib/whatsapp/reply-worker";
const raw = Number(process.env.WHATSAPP_REPLY_BATCH_SIZE ?? "100"), batchSize = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 500) : 100;
let processed = 0;
try { for (let index = 0; index < batchSize; index += 1) { const result = await processNextWhatsAppReply(); if (!result.processed) break; processed += 1; } console.log("whatsapp-reply-worker: complete", { processed, batchSize }); }
catch (error) { console.error("whatsapp-reply-worker: failed", { error: error instanceof Error ? error.message : "UNKNOWN" }); process.exitCode = 1; }
finally { await db.$disconnect(); }
