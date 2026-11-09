import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { orderSyncErrorCode } from '../app/lib/commerce/order-sync-error';

test('diagnostic keeps bounded same-provider codes and redacts arbitrary errors', () => {
  for (const provider of ['salla', 'shopify', 'woocommerce'] as const) {
    const prefix = provider.toUpperCase();
    for (const status of [401, 403, 404, 429, 500]) assert.equal(orderSyncErrorCode(provider, new Error(`${prefix}_ORDERS_HTTP_${status}`)), `${prefix}_ORDERS_HTTP_${status}`);
    for (const error of [new Error('secret token'), new Error(`${prefix}_ORDERS_HTTP_401 Bearer SECRET`), { message: { token: 'secret' } }, null]) assert.equal(orderSyncErrorCode(provider, error), `${prefix}_ORDER_SYNC_FAILED`);
    assert.equal(orderSyncErrorCode(provider, new Error(`${prefix}_CONFIG_INVALID:PRIVATE_FIELD`)), `${prefix}_CONFIG_INVALID`);
    assert.equal(orderSyncErrorCode(provider, { code: 'P1001' }), `${prefix}_ORDER_SYNC_DATABASE_CONNECTION`);
    assert.equal(orderSyncErrorCode(provider, { name: 'TimeoutError' }), `${prefix}_ORDER_SYNC_TIMEOUT`);
  }
  assert.equal(orderSyncErrorCode('shopify', new Error('SALLA_ORDERS_HTTP_401')), 'SHOPIFY_ORDER_SYNC_FAILED');
});

test('periodic failure stores safe diagnosis for the same tenant and never marks success', async () => {
  const updates: unknown[] = []; const events: unknown[] = [];
  const dependencies: Record<string, unknown> = {
    'server-only': {}, './order-sync-error': { orderSyncErrorCode },
    '../db': { db: {
      whatsAppCommerceIntegration: {
        findMany: async (input: {where:{provider:string}}) => input.where.provider === 'shopify' ? [{ id: 'integration-a', businessId: 'tenant-a' }] : [],
        updateMany: async (input: unknown) => { updates.push(input); },
      }, analyticsEvent: { create: async (input: unknown) => { events.push(input); } },
    } },
    './shopify-order-sync': { syncShopifyBookingOrders: async (input: {businessId:string;integrationId:string}) => { assert.equal(input.businessId,'tenant-a'); assert.equal(input.integrationId,'integration-a'); throw new Error('SHOPIFY_ORDERS_HTTP_401'); } },
    './salla-order-sync': { syncSallaBookingOrders: async () => assert.fail('wrong provider') },
    './woocommerce-commerce': { syncWooCommerceBookingOrders: async () => assert.fail('wrong provider') },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/lib/commerce/periodic-order-sync.ts', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, { exports, Date, process: {env:{}}, require:(id:string)=>{assert.ok(id in dependencies,id);return dependencies[id];} });
  const result = await (exports as typeof import('../app/lib/commerce/periodic-order-sync')).runPeriodicCommerceOrderSync();
  assert.equal(JSON.stringify(result),JSON.stringify({attempted:1,succeeded:0,failed:1}));
  assert.equal(JSON.stringify(updates),JSON.stringify([{where:{id:'integration-a',businessId:'tenant-a',status:'active'},data:{lastErrorCode:'SHOPIFY_ORDERS_HTTP_401'}}]));
  assert.match(JSON.stringify(events), /SHOPIFY_ORDERS_HTTP_401/);
  assert.doesNotMatch(JSON.stringify(events), /token|credential|secret/i);
});
