import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import * as domain from '../app/lib/retail-analytics/oauth-domain';
import { normalizeShopifyDomain } from '../app/lib/whatsapp/shopify-domain';
const env = { SHOPIFY_CLIENT_ID: 'test-client', SHOPIFY_CLIENT_SECRET: 'test-secret', SHOPIFY_ADMIN_API_VERSION: '2026-10', WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'), WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION: 'v1' };
async function fixture(options: { foreign?: boolean; expired?: boolean; collision?: boolean; revoked?: boolean } = {}) {
  let status = 'retail_shopify_created', calls = 0, saved = 0;
  const record = { id: 'session', businessId: 'tenant-a', initiatedByUserId: 'owner-a', integrationId: 'account-a', integration: { externalStoreId: 'example.myshopify.com' } };
  const tx = {
    business: { count: async () => 1 },
    whatsAppCommerceOAuthSession: {
      findFirst: async ({ where }: { where: { businessId: string; initiatedByUserId: string; integration: { provider: string }; expiresAt: { gt: Date }; status: string } }) => {
        assert.equal(where.businessId, 'tenant-a'); assert.equal(where.initiatedByUserId, 'owner-a');
        assert.equal(where.integration.provider, 'shopify'); assert.ok(where.expiresAt.gt instanceof Date);
        return options.foreign || options.expired || status !== where.status ? null : record;
      },
      updateMany: async ({ where, data }: { where: { status: string }; data: { status: string } }) => { if (where.status !== status) return { count: 0 }; status = data.status; return { count: 1 }; },
      count: async () => options.revoked ? 0 : 1,
      update: async ({ data }: { data: { status: string } }) => { status = data.status; },
    },
    whatsAppCommerceIntegration: {
      count: async () => options.collision ? 1 : 0,
      updateMany: async ({ where, data }: { where: { businessId: string; id: string }; data: { externalStoreId: string } }) => { assert.equal(where.businessId, 'tenant-a'); assert.equal(where.id, 'account-a'); assert.equal(data.externalStoreId, 'example.myshopify.com'); saved++; return { count: 1 }; },
    },
  };
  const dependencies: Record<string, unknown> = {
    'server-only': {}, 'node:crypto': crypto, '@prisma/client': { Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } } },
    '../db': { db: { ...tx, $transaction: async (fn: (database: typeof tx) => Promise<unknown>) => fn(tx) } },
    '../whatsapp/shopify-config': { shopifyAppOrigin: () => 'https://ir.sa' },
    '../whatsapp/shopify-domain': { normalizeShopifyDomain },
    '../whatsapp/commerce-credential-envelope': { encryptCommerceCredential: (input: { businessId: string; integrationId: string; provider: string }) => { assert.equal(input.businessId, 'tenant-a'); assert.equal(input.integrationId, 'account-a'); assert.equal(input.provider, 'shopify'); return { encrypted: true }; } },
    '../whatsapp/audit': { writeWhatsAppAuditLog: async () => {} }, './oauth-domain': domain,
  };
  const source = await readFile(new URL('../app/lib/retail-analytics/oauth.ts', import.meta.url), 'utf8');
  const exports = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: (id: string) => { assert.ok(id in dependencies, id); return dependencies[id]; }, process: { env }, Buffer, Date, Error, AbortSignal,
    fetch: async (url: string, init: RequestInit) => {
      calls++; assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
      assert.ok(url.startsWith('https://example.myshopify.com/admin/'));
      return calls === 1 ? Response.json({ access_token: 'private-token-long-enough', scope: 'read_orders' }) : Response.json({ data: { shop: { myshopifyDomain: 'example.myshopify.com', name: 'Retail' } } });
    },
  });
  return { module: exports as typeof import('../app/lib/retail-analytics/oauth'), calls: () => calls, saved: () => saved };
}
const input = { businessId: 'tenant-a', userId: 'owner-a', provider: 'shopify' as const, state: 'a'.repeat(43), code: 'provider-code', shop: 'example.myshopify.com' };
test('foreign or expired authorization cannot exchange any provider credential', async () => {
  for (const options of [{ foreign: true }, { expired: true }]) {
    const f = await fixture(options); await assert.rejects(f.module.finishRetailOAuth(input), /SESSION_EXPIRED/); assert.equal(f.calls(), 0);
  }
});
test('callback shop substitution fails before token exchange', async () => {
  const f = await fixture(); await assert.rejects(f.module.finishRetailOAuth({ ...input, shop: 'other.myshopify.com' }), /ACCOUNT_MISMATCH/); assert.equal(f.calls(), 0);
});
test('successful authorization binds encrypted token and cannot be replayed', async () => {
  const f = await fixture(); await f.module.finishRetailOAuth(input); assert.equal(f.saved(), 1);
  await assert.rejects(f.module.finishRetailOAuth(input), /SESSION_EXPIRED/); assert.equal(f.calls(), 2);
});
test('account collision or cancellation during exchange prevents saving credentials', async () => {
  for (const options of [{ collision: true }, { revoked: true }]) {
    const f = await fixture(options); await assert.rejects(f.module.finishRetailOAuth(input), /RETAIL_AUTHORIZATION_FAILED/); assert.equal(f.saved(), 0);
  }
});
