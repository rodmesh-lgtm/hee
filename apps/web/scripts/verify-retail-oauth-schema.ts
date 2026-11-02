import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

async function main() {
// CI-only, transactional temp fixtures: never read or modify customer records.
const target = new URL(process.env.DATABASE_URL ?? '');
assert(['localhost', '127.0.0.1'].includes(target.hostname) && target.pathname === '/hee_ci', 'Isolated hee_ci database required');
const prisma = new PrismaClient();
try {
  await prisma.$transaction(async tx => {
    const constraints = await tx.$queryRawUnsafe<Array<{ definition: string }>>(
      `SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname = 'WhatsAppCommerceOAuthSession_integration_tenant_fkey' AND conrelid = '"WhatsAppCommerceOAuthSession"'::regclass`);
    assert.equal(constraints.length, 1);
    assert.match(constraints[0].definition, /FOREIGN KEY \("integrationId", "businessId"\)/);
    await tx.$executeRawUnsafe('CREATE TEMP TABLE retail_integrations (LIKE "WhatsAppCommerceIntegration" INCLUDING ALL) ON COMMIT DROP');
    await tx.$executeRawUnsafe('CREATE TEMP TABLE retail_sessions (LIKE "WhatsAppCommerceOAuthSession" INCLUDING ALL) ON COMMIT DROP');
    // LIKE copies deployed checks/indexes, not FKs. Exercise the verified tenant FK on temp fixtures.
    await tx.$executeRawUnsafe('ALTER TABLE retail_sessions ADD FOREIGN KEY ("integrationId", "businessId") REFERENCES retail_integrations ("id", "businessId")');
    async function rejected(sql: string, values: unknown[] = []) {
      await tx.$executeRawUnsafe('SAVEPOINT reject_case');
      let failed = false;
      try { await tx.$executeRawUnsafe(sql, ...values); } catch { failed = true; }
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT reject_case');
      await tx.$executeRawUnsafe('RELEASE SAVEPOINT reject_case');
      assert(failed, 'Invalid lifecycle or tenant write was accepted');
    }
    for (const provider of ['shopify', 'foodics']) {
      await tx.$executeRawUnsafe(`INSERT INTO retail_integrations (id,"businessId",provider,"externalStoreId","updatedAt") VALUES ($1,'tenant-a',$1,$1,NOW())`, provider);
      await tx.$executeRawUnsafe(`INSERT INTO retail_sessions (id,"businessId","integrationId","initiatedByUserId","stateDigest",status,"expiresAt","updatedAt") VALUES ($1,'tenant-a',$1,'owner',repeat($2,64),$3,NOW()+INTERVAL '10 minutes',NOW())`, provider, provider === 'shopify' ? 'a' : 'b', `retail_${provider}_created`);
      await tx.$executeRawUnsafe(`UPDATE retail_sessions SET status=$2 WHERE id=$1`, provider, `retail_${provider}_exchanging`);
      await rejected(`UPDATE retail_sessions SET "businessId"='tenant-b' WHERE id=$1`, [provider]);
      await rejected(`UPDATE retail_sessions SET status='connected' WHERE id=$1`, [provider]);
      await tx.$executeRawUnsafe(`UPDATE retail_integrations SET status='authorizing' WHERE id=$1`, provider);
      await tx.$executeRawUnsafe(`UPDATE retail_integrations SET status='authorization_review_required' WHERE id=$1`, provider);
      await rejected(`UPDATE retail_integrations SET status='revocation_pending' WHERE id=$1`, [provider]);
      await rejected(`UPDATE retail_integrations SET status='active' WHERE id=$1`, [provider]);
      await tx.$executeRawUnsafe(`UPDATE retail_integrations SET status='authorizing',"credentialEnvelope"='{"test":true}'::jsonb WHERE id=$1`, provider);
      await tx.$executeRawUnsafe(`UPDATE retail_integrations SET status='active',"connectedAt"=NOW() WHERE id=$1`, provider);
      await tx.$executeRawUnsafe(`UPDATE retail_sessions SET status='connected',"consumedAt"=NOW() WHERE id=$1`, provider);
      await rejected(`UPDATE retail_sessions SET status=$2 WHERE id=$1`, [provider, `retail_${provider}_created`]);
      await tx.$executeRawUnsafe(`UPDATE retail_integrations SET status='revocation_pending',"disconnectedAt"=NOW() WHERE id=$1`, provider);
      await rejected(`UPDATE retail_integrations SET status='disconnected' WHERE id=$1`, [provider]);
      await tx.$executeRawUnsafe(`UPDATE retail_integrations SET status='disconnected',"credentialEnvelope"=NULL WHERE id=$1`, provider);
      // Reconnect an earlier disconnected account: historical timestamps are preserved until success.
      await tx.$executeRawUnsafe(`UPDATE retail_integrations SET status='authorizing' WHERE id=$1`, provider);
    }
    await tx.$executeRawUnsafe(`INSERT INTO retail_integrations (id,"businessId",provider,"externalStoreId","updatedAt") VALUES ('legacy','tenant-a','salla','legacy',NOW())`);
    await rejected(`UPDATE retail_integrations SET status='authorizing' WHERE id='legacy'`);
    await rejected(`UPDATE retail_integrations SET status='active' WHERE id='legacy'`);
    await rejected(`UPDATE retail_integrations SET provider='untrusted' WHERE id='legacy'`);
    console.log('PASS: deployed retail OAuth checks, reconnect, revocation, legacy invariants and composite tenant FK');
  }, { timeout: 30000 });
} finally {
  await prisma.$disconnect();
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
