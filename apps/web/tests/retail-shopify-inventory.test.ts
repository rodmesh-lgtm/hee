import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchShopifyInventory } from '../app/lib/retail-analytics/shopify-inventory';
const input = { shop: 'retail.myshopify.com', token: 'test-token', apiVersion: '2026-10' };
const item = { id: 'gid://shopify/ProductVariant/1', displayName: 'Shirt / Small', sku: 'S-1', inventoryQuantity: 0, inventoryItem: { tracked: true }, product: { status: 'ACTIVE' } };
function response(nodes: unknown[], more = false, cursor: string | null = null) { return new Response(JSON.stringify({ data: { productVariants: { nodes, pageInfo: { hasNextPage: more, endCursor: cursor } } } })); }
test('reads real zero stock and keeps untracked quantities unknown', async () => {
  const r = await fetchShopifyInventory(input, async () => response([item, { ...item, id: '2', inventoryQuantity: 42, inventoryItem: { tracked: false } }]));
  assert.equal(r.complete, true); assert.equal(r.items[0].quantity, 0); assert.equal(r.items[1].quantity, null); assert.equal(JSON.stringify(r).includes('test-token'), false);
});
test('provider error cannot become empty inventory', async () => {
  await assert.rejects(fetchShopifyInventory(input, async () => new Response('{}', { status: 403 })), /REAUTHORIZE_REQUIRED/);
  await assert.rejects(fetchShopifyInventory(input, async () => new Response(JSON.stringify({ errors: [{ message: 'denied' }] }))), /PROVIDER_QUERY_FAILED/);
});
test('duplicates across pages reject inconsistent snapshot', async () => { let page = 0; await assert.rejects(fetchShopifyInventory(input, async () => response([item], ++page < 2, 'next')), /PROVIDER_PAGINATION_CHANGED/); });
test('snapshot explicitly partial after bounded pagination', async () => { let page = 0; const r = await fetchShopifyInventory(input, async () => response([{ ...item, id: String(++page) }], true, String(page))); assert.equal(r.complete, false); assert.equal(r.items.length, 5); });
test('rejects invalid quantities instead of inventing stock counts', async () => { await assert.rejects(fetchShopifyInventory(input, async () => response([{ ...item, inventoryQuantity: '2' }])), /INVALID_PROVIDER_RESPONSE/); });
test('does not send credentials to arbitrary hosts or follow redirects', async () => {
  let calls = 0; await assert.rejects(fetchShopifyInventory({ ...input, shop: 'evil.test' }, async () => { calls++; return response([]); }), /INVALID_PROVIDER_HOST/); assert.equal(calls, 0);
  await fetchShopifyInventory(input, async (_url, options) => { assert.equal(options?.redirect, 'error'); assert.equal(options?.cache, 'no-store'); return response([]); });
});
