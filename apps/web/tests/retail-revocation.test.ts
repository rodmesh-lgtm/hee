import test from 'node:test';
import assert from 'node:assert/strict';
import { revokeRetailProvider } from '../app/lib/retail-analytics/revoke-provider';
const foodics = { provider: 'foodics' as const, token: 'test-token-private-long', externalId: 'sandbox:12345678-1234-1234-1234-123456789012', environment: 'sandbox' };
const shopify = { provider: 'shopify' as const, token: foodics.token, externalId: 'example.myshopify.com', apiVersion: '2026-10' };
test('Foodics revocation uses the credential environment and fixed endpoint', async () => {
  await revokeRetailProvider(foodics, async (url, init) => {
    assert.equal(url, 'https://api-sandbox.foodics.com/v5/tokens/client');
    assert.equal(init?.method, 'DELETE'); assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store');
    return new Response(null, { status: 200 });
  });
});
test('environment mismatch and malicious Shopify host cannot receive credentials', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return new Response(); };
  await assert.rejects(revokeRetailProvider({ ...foodics, environment: 'production' }, fetcher), /MISMATCH/);
  await assert.rejects(revokeRetailProvider({ ...shopify, externalId: 'example.myshopify.com.evil.test' }, fetcher));
  assert.equal(calls, 0);
});
test('Shopify uninstalls only the calling app and requires confirmed payload', async () => {
  await revokeRetailProvider(shopify, async (url, init) => {
    assert.equal(url, 'https://example.myshopify.com/admin/api/2026-10/graphql.json');
    assert.match(String(init?.body), /appUninstall/);
    return Response.json({ data: { appUninstall: { app: { id: 'gid://shopify/App/1' }, userErrors: [] } } });
  });
  for (const body of [{}, { data: { appUninstall: { app: null, userErrors: [] } } }, { errors: [{ message: 'private' }] }]) {
    await assert.rejects(revokeRetailProvider(shopify, async () => Response.json(body)), /REVOCATION_PENDING/);
  }
});
test('failure and rate-limit responses stay pending; rejected credentials are already inactive', async () => {
  for (const status of [403, 404, 429, 500]) await assert.rejects(revokeRetailProvider(foodics, async () => new Response(null, { status })), /REVOCATION_PENDING/);
  await revokeRetailProvider(foodics, async () => new Response(null, { status: 401 }));
  await assert.rejects(revokeRetailProvider(foodics, async () => { throw new Error('timeout'); }), /timeout/);
});
