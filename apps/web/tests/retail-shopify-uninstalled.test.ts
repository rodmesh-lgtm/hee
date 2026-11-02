import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createHmac } from 'node:crypto';
import ts from 'typescript';
import { normalizeShopifyDomain, verifyShopifyWebhookHmac } from '../app/lib/whatsapp/shopify-domain';
import { readBoundedText } from '../app/lib/request-body';
async function load(path: string, deps: Record<string, unknown>, extras: Record<string, unknown> = {}) {
  const exports = {};
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (key: string) => { assert.ok(key in deps, key); return deps[key]; }, process: { env: { SHOPIFY_CLIENT_SECRET: 'test-secret', SHOPIFY_ADMIN_API_VERSION: '2026-10' } }, Response, Date, AbortSignal, ...extras });
  return exports;
}
test('uninstall authenticates signed body and rejects a different store header before database access', async () => {
  const calls: string[] = [];
  const route = await load('../app/api/retail-analytics/shopify/uninstalled/route.ts', {
    '../../../../lib/request-body': { readBoundedText },
    '../../../../lib/whatsapp/shopify-domain': { normalizeShopifyDomain, verifyShopifyWebhookHmac },
    '../../../../lib/retail-analytics/shopify-uninstalled': { handleRetailShopifyUninstalled: async (shop: string) => calls.push(shop) },
  }) as { POST: (r: Request) => Promise<Response> };
  const body = JSON.stringify({ myshopify_domain: 'one.myshopify.com' });
  const headers = { 'content-type': 'application/json', 'x-shopify-topic': 'app/uninstalled', 'x-shopify-shop-domain': 'one.myshopify.com', 'x-shopify-hmac-sha256': createHmac('sha256', 'test-secret').update(body).digest('base64') };
  const send = (patch: Record<string, string> = {}) => route.POST(new Request('https://ir.sa/webhook', { method: 'POST', body, headers: { ...headers, ...patch } }));
  assert.equal((await send({ 'x-shopify-hmac-sha256': 'bad' })).status, 401);
  assert.equal((await send({ 'x-shopify-shop-domain': 'two.myshopify.com' })).status, 400);
  assert.equal((await send({ 'x-shopify-topic': 'orders/create' })).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await send()).status, 200);
  assert.deepEqual(calls, ['one.myshopify.com']);
});
async function fixture(http: number, changed = 1) {
  let writes = 0, cancelled = 0;
  const updatedAt = new Date();
  const tx = {
    whatsAppCommerceIntegration: { updateMany: async ({ where }: { where: { id: string; businessId: string; updatedAt: Date } }) => {
      assert.equal(where.id, 'integration'); assert.equal(where.businessId, 'tenant'); assert.equal(where.updatedAt, updatedAt); writes++; return { count: changed };
    } },
    whatsAppCommerceOAuthSession: { updateMany: async () => { cancelled++; } },
    whatsAppShopifyWebhookSync: { updateMany: async () => {} },
  };
  const handler = await load('../app/lib/retail-analytics/shopify-uninstalled.ts', {
    'server-only': {}, '@prisma/client': { Prisma: { DbNull: null, TransactionIsolationLevel: { Serializable: 'Serializable' } } },
    '../db': { db: { whatsAppCommerceIntegration: { findMany: async ({ where }: { where: { externalStoreId: string; provider: string } }) => {
      assert.equal(where.externalStoreId, 'one.myshopify.com'); assert.equal(where.provider, 'shopify');
      return [{ id: 'integration', businessId: 'tenant', updatedAt, credentialEnvelope: {} }];
    } }, $transaction: async (fn: (db: typeof tx) => Promise<unknown>) => fn(tx) } },
    '../whatsapp/shopify-domain': { normalizeShopifyDomain },
    '../whatsapp/commerce-credential-envelope': { decryptCommerceCredential: () => JSON.stringify({ accessToken: 'test-only-token-value' }) },
    '../whatsapp/audit': { writeWhatsAppAuditLog: async () => {} },
  }, { fetch: async (url: string) => { assert.equal(url, 'https://one.myshopify.com/admin/api/2026-10/graphql.json'); return new Response('{}', { status: http }); } }) as { handleRetailShopifyUninstalled: (s: string) => Promise<void> };
  return { run: () => handler.handleRetailShopifyUninstalled('one.myshopify.com'), state: () => ({ writes, cancelled }) };
}
test('delayed uninstall cannot disconnect a newly active provider token', async () => { const f = await fixture(200); await f.run(); assert.deepEqual(f.state(), { writes: 0, cancelled: 0 }); });
test('provider 401 disconnects the exact saved revision and cancels sessions', async () => { const f = await fixture(401); await f.run(); assert.deepEqual(f.state(), { writes: 1, cancelled: 1 }); });
test('provider throttling/failure retains credentials and causes retry', async () => { for (const status of [403, 429, 500]) { const f = await fixture(status); await assert.rejects(f.run(), /PROVIDER_VERIFICATION_PENDING/); assert.equal(f.state().writes, 0); } });
test('concurrent reconnection prevents stale cleanup and session cancellation', async () => { const f = await fixture(401, 0); await assert.rejects(f.run(), /INTEGRATION_CHANGED/); assert.equal(f.state().cancelled, 0); });
