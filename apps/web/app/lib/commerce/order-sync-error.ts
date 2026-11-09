import { operationalErrorCategory } from '../operational-error';

/** Persist bounded diagnostic codes only, never provider messages or credential payloads. */
export function orderSyncErrorCode(provider: 'salla' | 'shopify' | 'woocommerce', error: unknown): string {
  const prefix = provider.toUpperCase();
  const item = error && typeof error === 'object' ? error as { message?: unknown; name?: unknown } : null;
  if (typeof item?.message === 'string') {
    if (new RegExp(`^${prefix}_ORDERS_HTTP_[1-5][0-9]{2}$`).test(item.message)) return item.message;
    for (const suffix of ['CREDENTIAL_INVALID', 'INTEGRATION_UNAVAILABLE', 'CONNECTION_CHANGED']) {
      if (item.message === `${prefix}_${suffix}`) return `${prefix}_${suffix}`;
    }
    if (item.message.startsWith(`${prefix}_CONFIG_INVALID:`)) return `${prefix}_CONFIG_INVALID`;
  }
  const category = operationalErrorCategory(error);
  if (category === 'database_connection' || category === 'database_timeout') return `${prefix}_ORDER_SYNC_${category.toUpperCase()}`;
  if (item?.name === 'TimeoutError' || item?.name === 'AbortError') return `${prefix}_ORDER_SYNC_TIMEOUT`;
  return `${prefix}_ORDER_SYNC_FAILED`;
}
