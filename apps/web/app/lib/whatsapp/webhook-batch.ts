type WebhookResult = { processed: boolean; id?: string | null; error?: string };
export const UNMATCHED_RECEIPT = "WHATSAPP_STATUS_MESSAGE_NOT_FOUND";

/** Do not let one pending receipt monopolize a batch; every event stays durable. */
export async function processWebhookBatch(limit: number, next: (excludedIds: readonly string[]) => Promise<WebhookResult>) {
  const excludedIds: string[] = [];
  let processed = 0, deferred = 0, failed = 0;
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit,500) : 100;
  for (let index=0; index<size; index+=1) {
    const result = await next(excludedIds);
    if (result.processed) { processed++; continue; }
    if (!result.error) break;
    if (result.error === UNMATCHED_RECEIPT && result.id) deferred++; else failed++;
    if (!result.id || excludedIds.includes(result.id)) break;
    excludedIds.push(result.id);
  }
  return {processed,deferred,failed};
}
