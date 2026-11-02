import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { retailProvider } from '../app/lib/retail-analytics/oauth-domain';
async function fixture(options: { foreign?: boolean; fail?: boolean; noToken?: boolean } = {}) {
  let status = 'active', cleared = false, revocations = 0, cancelled = false;
  const integration = { id: 'account', businessId: 'tenant', provider: 'foodics', externalStoreId: 'sandbox:business', credentialEnvelope: options.noToken ? null : { encrypted: true } };
  const tx = {
    business: { count: async () => 1 },
    whatsAppCommerceIntegration: {
      findFirst: async ({ where }: { where: { id: string; businessId: string } }) => { assert.equal(where.id, 'account'); assert.equal(where.businessId, 'tenant'); return options.foreign ? null : integration; },
      updateMany: async ({ where, data }: { where: { businessId: string; status?: string }; data: { status: string; credentialEnvelope?: unknown } }) => {
        assert.equal(where.businessId, 'tenant'); if (where.status) assert.equal(status, where.status);
        status = data.status; if ('credentialEnvelope' in data) cleared = true; return { count: 1 };
      },
    },
    whatsAppCommerceOAuthSession: { updateMany: async ({ where }: { where: { status: { in: string[] } } }) => { assert.ok(where.status.in.includes('retail_foodics_exchanging')); assert.ok(where.status.in.includes('retail_shopify_created')); cancelled = true; } },
    whatsAppShopifyWebhookSync: { updateMany: async () => {} },
  };
  const deps: Record<string, unknown> = {
    'server-only': {}, '@prisma/client': { Prisma: { DbNull: null, TransactionIsolationLevel: { Serializable: 'Serializable' } } },
    '../db': { db: { ...tx, $transaction: async (fn: (database: typeof tx) => Promise<unknown>) => fn(tx) } },
    '../whatsapp/commerce-credential-envelope': { decryptCommerceCredential: (context: { businessId: string; integrationId: string; provider: string }) => { assert.equal(context.businessId, 'tenant'); assert.equal(context.integrationId, 'account'); assert.equal(context.provider, 'foodics'); return JSON.stringify({ accessToken: 'private-token', environment: 'sandbox' }); } },
    '../whatsapp/audit': { writeWhatsAppAuditLog: async () => {} }, './oauth-domain': { retailProvider },
    './revoke-provider': { revokeRetailProvider: async () => { assert.equal(status, 'revocation_pending'); assert.equal(cleared, false); assert.equal(cancelled, true); revocations++; if (options.fail) throw new Error('private-provider-error'); } },
  };
  const exports = {};
  const source = await readFile(new URL('../app/lib/retail-analytics/disconnect.ts', import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: (name: string) => { assert.ok(name in deps, name); return deps[name]; }, Date, Error, process: { env: {} } });
  return { module: exports as typeof import('../app/lib/retail-analytics/disconnect'), current: () => ({ status, cleared, revocations }) };
}
const input = { businessId: 'tenant', userId: 'owner', integrationId: 'account' };
test('foreign account cannot be disconnected or send any credentials to provider', async () => {
  const f = await fixture({ foreign: true }); await assert.rejects(f.module.disconnectRetailAccount(input), /ACCOUNT_UNAVAILABLE/); assert.equal(f.current().revocations, 0);
});
test('successful revoke blocks reads and cancels sessions before deleting credential', async () => {
  const f = await fixture(); assert.equal(await f.module.disconnectRetailAccount(input), 'disconnected'); assert.deepEqual(f.current(), { status: 'disconnected', cleared: true, revocations: 1 });
});
test('uncertain provider result preserves encrypted token and keeps account unavailable', async () => {
  const f = await fixture({ fail: true }); assert.equal(await f.module.disconnectRetailAccount(input), 'revocation-pending'); assert.deepEqual(f.current(), { status: 'revocation_pending', cleared: false, revocations: 1 });
});
test('unfinished account without a token cancels locally without provider request', async () => {
  const f = await fixture({ noToken: true }); assert.equal(await f.module.disconnectRetailAccount(input), 'disconnected'); assert.equal(f.current().revocations, 0);
});
