import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
async function fixture(options: { collision?: boolean; failure?: boolean; changed?: boolean } = {}) {
  let status = 'authorizing', cleared = false, revoked = 0;
  const integration = {
    count: async () => options.collision ? 1 : 0,
    updateMany: async ({ where, data }: { where: { businessId: string; id: string; status: string }; data: { status: string; credentialEnvelope?: unknown } }) => {
      assert.equal(where.businessId, 'tenant'); assert.equal(where.id, 'account'); assert.equal(where.status, status);
      if (options.changed) return { count: 0 };
      status = data.status; if ('credentialEnvelope' in data) cleared = true; return { count: 1 };
    },
  };
  const tx = { whatsAppCommerceIntegration: integration };
  const deps: Record<string, unknown> = {
    'server-only': {}, '@prisma/client': { Prisma: { DbNull: null, TransactionIsolationLevel: { Serializable: 'Serializable' } } },
    '../db': { db: { ...tx, $transaction: async (fn: (db: typeof tx) => Promise<unknown>) => fn(tx) } },
    './revoke-provider': { revokeRetailProvider: async () => { assert.equal(status, 'revocation_pending'); assert.equal(cleared, false); revoked++; if (options.failure) throw new Error('provider failed'); } },
  };
  const exports = {};
  runInNewContext(ts.transpileModule(await readFile(new URL('../app/lib/retail-analytics/oauth-recovery.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (id: string) => { assert.ok(id in deps, id); return deps[id]; }, Date });
  return { recover: (exports as typeof import('../app/lib/retail-analytics/oauth-recovery')).recoverFailedRetailAuthorization, state: () => ({ status, cleared, revoked }) };
}
const input = { businessId: 'tenant', integrationId: 'account', provider: 'shopify' as const, token: 'test-token-long-enough', externalId: 'one.myshopify.com', environment: '', apiVersion: '2026-10' };
test('failed activation revokes only after preserving the credential and blocking reconnect', async () => { const f = await fixture(); await f.recover(input); assert.deepEqual(f.state(), { status: 'disconnected', cleared: true, revoked: 1 }); });
test('uncertain revocation retains encrypted credential for an owner retry', async () => { const f = await fixture({ failure: true }); await f.recover(input); assert.deepEqual(f.state(), { status: 'revocation_pending', cleared: false, revoked: 1 }); });
test('foreign-account collision never uninstalls another connected application', async () => { const f = await fixture({ collision: true }); await f.recover(input); assert.deepEqual(f.state(), { status: 'authorization_review_required', cleared: false, revoked: 0 }); });
test('unknown external identity requires review without provider mutation', async () => { const f = await fixture(); await f.recover({ ...input, externalId: null }); assert.equal(f.state().revoked, 0); assert.equal(f.state().status, 'authorization_review_required'); });
test('a changed integration cannot be revoked by stale failure cleanup', async () => { const f = await fixture({ changed: true }); await f.recover(input); assert.equal(f.state().revoked, 0); assert.equal(f.state().cleared, false); });
