import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { readDatabaseWithRetry } from '../app/lib/database-read-retry';

const connectionError = () => Object.assign(new Error('ConnectorError(PostgresError { code: "08P01", message: "server conn crashed?" })'), { name: 'PrismaClientUnknownRequestError' });

test('session connection failures get one fresh read, without substituting successful data', async () => {
  for (const error of [connectionError(), { code: 'P2024' }, { code: 'ECONNRESET' }]) {
    let reads = 0; const delays: number[] = [];
    assert.equal(await readDatabaseWithRetry(async () => { if (++reads === 1) throw error; return null; }, async ms => { delays.push(ms); }), null);
    assert.equal(reads, 2); assert.deepEqual(delays, [500]);
  }
});
test('persistent outages propagate after two reads; schema and authorization errors propagate immediately', async () => {
  for (const [error, expected] of [[connectionError(), 2], [{ code: 'P2021' }, 1], [new Error('UNAUTHENTICATED'), 1], [new TypeError('bad query'), 1]] as const) {
    let reads = 0;
    await assert.rejects(readDatabaseWithRetry(async () => { reads++; throw error; }, async () => {}), e => e === error);
    assert.equal(reads, expected);
  }
});

function adminHarness(afterFailure: unknown, failAgain = false) {
  let reads = 0; let deletes = 0;
  const dependencies: Record<string, unknown> = {
    'node:crypto': { createHash, randomBytes },
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'test-browser-token' }) }) },
    'next/navigation': { redirect: () => { throw new Error('REDIRECT'); }, notFound: () => { throw new Error('NOT_FOUND'); } },
    './db': { db: { session: { findUnique: async () => { if (++reads === 1 || failAgain) throw connectionError(); return afterFailure; }, deleteMany: async () => { deletes++; } } } },
    './database-read-retry': { readDatabaseWithRetry: <T>(read: () => Promise<T>) => readDatabaseWithRetry(read, async () => {}) },
    './auth': { getCurrentUser: async () => assert.fail('Production cannot fall back to customer sessions') },
    './qa-audit': { isQaAuditModeUser: async () => false },
    './runtime-environment': { isProductionRuntime: () => true, isExplicitTestRuntime: () => false },
  };
  const exports = {};
  const source = readFileSync(new URL('../app/lib/admin.ts', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, URL, process: { env: { HEE_ADMIN_EMAILS: 'admin@example.test' } },
    require: (id: string) => { assert.ok(id in dependencies, id); return dependencies[id]; },
  });
  return { run: () => (exports as typeof import('../app/lib/admin')).getCurrentAdminUser(), counts: () => ({ reads, deletes }) };
}
const user = { id: 'admin', email: 'admin@example.test', emailVerifiedAt: new Date(), deletedAt: null };
const session = { user, expiresAt: new Date(Date.now() + 60_000) };
test('admin lookup recovers using the freshly authorized session', async () => {
  const h = adminHarness(session); assert.equal((await h.run())?.id, 'admin'); assert.deepEqual(h.counts(), { reads: 2, deletes: 0 });
});
test('revocation between failed read and retry denies access without session recreation', async () => {
  const h = adminHarness(null); assert.equal(await h.run(), null); assert.deepEqual(h.counts(), { reads: 2, deletes: 0 });
});
test('retry preserves expiry, deletion, mailbox verification and admin allowlist checks', async () => {
  for (const invalid of [
    { ...session, expiresAt: new Date(0) },
    { ...session, user: { ...user, deletedAt: new Date() } },
    { ...session, user: { ...user, emailVerifiedAt: null } },
    { ...session, user: { ...user, email: 'customer@example.test' } },
  ]) {
    const h = adminHarness(invalid); assert.equal(await h.run(), null); assert.deepEqual(h.counts(), { reads: 2, deletes: 1 });
  }
});
test('persistent admin lookup failure never deletes or recreates a session', async () => {
  const h = adminHarness(session, true); await assert.rejects(h.run()); assert.deepEqual(h.counts(), { reads: 2, deletes: 0 });
});
