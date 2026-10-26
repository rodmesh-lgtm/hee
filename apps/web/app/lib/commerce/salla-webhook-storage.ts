/** Keep partner credentials and merchant settings out of the operational inbox.
 * Custom OAuth exchanges and encrypts tokens separately, after tenant binding.
 * These events are not consumed by the order/cart processor.
 */
export function sallaWebhookStoragePayload(payload: unknown, eventType: string, merchantId: string): object {
  if (eventType.startsWith("app.")) {
    return { event: eventType, merchant: merchantId, data: { omitted: true } };
  }
  return payload as object;
}
