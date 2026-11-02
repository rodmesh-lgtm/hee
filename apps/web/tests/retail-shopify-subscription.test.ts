import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureRetailShopifySubscription, RETAIL_UNINSTALL_URI } from '../app/lib/retail-analytics/shopify-subscription';
const input = { shop: 'store.myshopify.com', token: 'test-private-token-value', apiVersion: '2026-10' };
const subscription = { id: 'gid://shopify/WebhookSubscription/1', topic: 'APP_UNINSTALLED', uri: RETAIL_UNINSTALL_URI };
const list = (nodes: unknown[], hasNextPage = false) => ({ data: { webhookSubscriptions: { nodes, pageInfo: { hasNextPage } } } });
const created = { data: { webhookSubscriptionCreate: { webhookSubscription: subscription, userErrors: [] } } };
function fixture(results: unknown[], status = 200) {
  const calls: Array<{ query: string; variables: Record<string, unknown> }> = [];
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, 'https://store.myshopify.com/admin/api/2026-10/graphql.json');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store');
    calls.push(JSON.parse(String(init?.body)));
    return Response.json(results[calls.length - 1], { status });
  };
  return { calls, fetcher: fetcher as typeof fetch };
}
test('registers only uninstall with canonical INFRO destination before reporting success', async () => {
  const f = fixture([list([]), created]); await ensureRetailShopifySubscription(input, f.fetcher);
  assert.equal(f.calls.length, 2); assert.deepEqual(f.calls[1].variables, { topic: 'APP_UNINSTALLED', subscription: { uri: RETAIL_UNINSTALL_URI, format: 'JSON' } });
});
test('existing exact subscription is idempotent', async () => {
  const f = fixture([list([subscription])]); await ensureRetailShopifySubscription(input, f.fetcher); assert.equal(f.calls.length, 1);
});
test('wrong destination does not satisfy lifecycle setup', async () => {
  const f = fixture([list([{ ...subscription, uri: 'https://other.example/hook' }]), created]); await ensureRetailShopifySubscription(input, f.fetcher); assert.equal(f.calls.length, 2);
});
test('incomplete list, GraphQL errors and rejected creation never become connected', async () => {
  for (const results of [[list([], true)], [{ errors: [{ message: 'denied' }] }], [list([]), { data: { webhookSubscriptionCreate: { webhookSubscription: null, userErrors: [{ message: 'denied' }] } } }]]) {
    const f = fixture(results); await assert.rejects(ensureRetailShopifySubscription(input, f.fetcher), /WEBHOOK_REGISTRATION/);
  }
});
test('invalid host and version cannot send token; provider outage is not success', async () => {
  const f = fixture([{}], 503);
  await assert.rejects(ensureRetailShopifySubscription({ ...input, shop: 'store.myshopify.com.evil.example' }, f.fetcher));
  await assert.rejects(ensureRetailShopifySubscription({ ...input, apiVersion: 'latest' }, f.fetcher));
  assert.equal(f.calls.length, 0); await assert.rejects(ensureRetailShopifySubscription(input, f.fetcher), /WEBHOOK_REGISTRATION_FAILED/);
});
