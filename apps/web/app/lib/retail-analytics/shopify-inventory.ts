/** Current sellable quantities across locations, not a historical stock ledger. */
export type InventoryReport = { fetchedAt: string; complete: boolean; items: { id: string; name: string; sku: string | null; status: string; tracked: boolean; quantity: number | null }[] };
const query = `query InfroRetailInventory($after: String) { productVariants(first: 100, after: $after) { nodes { id displayName sku inventoryQuantity inventoryItem { tracked } product { status } } pageInfo { hasNextPage endCursor } } }`;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_PROVIDER_RESPONSE');
  return value as Record<string, unknown>;
}
export async function fetchShopifyInventory(input: { shop: string; token: string; apiVersion: string }, fetcher: typeof fetch = fetch): Promise<InventoryReport> {
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(input.shop) || !/^20\d{2}-(01|04|07|10)$/.test(input.apiVersion)) throw new Error('INVALID_PROVIDER_HOST');
  const items: InventoryReport['items'] = [], seen = new Set<string>(), cursors = new Set<string>();
  let after: string | null = null, complete = false;
  for (let page = 0; page < 5; page++) {
    const response = await fetcher(`https://${input.shop}/admin/api/${input.apiVersion}/graphql.json`, { method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000), headers: { 'content-type': 'application/json', 'x-shopify-access-token': input.token }, body: JSON.stringify({ query, variables: { after } }) });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'REAUTHORIZE_REQUIRED' : response.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_UNAVAILABLE');
    const payload = record(await response.json());
    if (Array.isArray(payload.errors) && payload.errors.length) throw new Error('PROVIDER_QUERY_FAILED');
    const connection = record(record(payload.data).productVariants), info = record(connection.pageInfo);
    if (!Array.isArray(connection.nodes) || connection.nodes.length > 100 || typeof info.hasNextPage !== 'boolean') throw new Error('INVALID_PROVIDER_RESPONSE');
    for (const raw of connection.nodes) {
      const item = record(raw), product = record(item.product), inventory = record(item.inventoryItem);
      if (typeof item.id !== 'string' || !item.id || typeof item.displayName !== 'string' || item.displayName.length > 1000 || (item.sku !== null && typeof item.sku !== 'string') || !['ACTIVE','DRAFT','ARCHIVED'].includes(String(product.status)) || typeof inventory.tracked !== 'boolean' || (item.inventoryQuantity !== null && !Number.isSafeInteger(item.inventoryQuantity))) throw new Error('INVALID_PROVIDER_RESPONSE');
      if (seen.has(item.id)) throw new Error('PROVIDER_PAGINATION_CHANGED');
      seen.add(item.id);
      items.push({ id: item.id, name: item.displayName, sku: item.sku as string | null, status: String(product.status), tracked: inventory.tracked, quantity: inventory.tracked ? item.inventoryQuantity as number | null : null });
    }
    if (!info.hasNextPage) { complete = true; break; }
    if (typeof info.endCursor !== 'string' || !info.endCursor || cursors.has(info.endCursor)) throw new Error('INVALID_PROVIDER_PAGINATION');
    cursors.add(info.endCursor); after = info.endCursor;
  }
  return { fetchedAt: new Date().toISOString(), complete, items };
}
