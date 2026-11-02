import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from '../db';
import { normalizeShopifyDomain } from '../whatsapp/shopify-domain';
import { decryptCommerceCredential, type CommerceCredentialEnvelope } from '../whatsapp/commerce-credential-envelope';
import { writeWhatsAppAuditLog } from '../whatsapp/audit';

// A delayed uninstall delivery must not erase a subsequent installation's token.
// Check the currently saved credential with Shopify, then compare-and-swap it.
export async function handleRetailShopifyUninstalled(shop: string) {
  const domain = normalizeShopifyDomain(shop);
  const accounts = await db.whatsAppCommerceIntegration.findMany({ where: {
    provider: 'shopify', externalStoreId: domain, status: { in: ['active', 'revocation_pending'] },
  }, select: { id: true, businessId: true, updatedAt: true, credentialEnvelope: true } });
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION ?? '';
  if (!/^20\d{2}-(01|04|07|10)$/.test(apiVersion)) throw new Error('PROVIDER_NOT_CONFIGURED');
  for (const account of accounts) {
    if (!account.credentialEnvelope) continue;
    const credential = JSON.parse(decryptCommerceCredential({
      envelope: account.credentialEnvelope as CommerceCredentialEnvelope,
      encryptionKeyBase64: process.env.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY ?? '',
      businessId: account.businessId, integrationId: account.id, provider: 'shopify',
    })) as { accessToken?: unknown };
    if (typeof credential.accessToken !== 'string' || credential.accessToken.length < 16) throw new Error('INVALID_CREDENTIAL');
    const response = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-shopify-access-token': credential.accessToken },
      body: JSON.stringify({ query: '{ shop { id } }' }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(4000),
    });
    await response.body?.cancel();
    // A live credential belongs to an installation that must remain connected.
    if (response.ok) continue;
    if (response.status !== 401) throw new Error('PROVIDER_VERIFICATION_PENDING');
    await db.$transaction(async tx => {
      const changed = await tx.whatsAppCommerceIntegration.updateMany({ where: {
        id: account.id, businessId: account.businessId, provider: 'shopify', externalStoreId: domain,
        updatedAt: account.updatedAt, status: { in: ['active', 'revocation_pending'] },
      }, data: { status: 'disconnected', disconnectedAt: new Date(), credentialEnvelope: Prisma.DbNull, lastErrorCode: null } });
      if (!changed.count) throw new Error('INTEGRATION_CHANGED');
      await tx.whatsAppCommerceOAuthSession.updateMany({ where: { businessId: account.businessId, integrationId: account.id,
        status: { in: ['created', 'exchanging', 'retail_shopify_created', 'retail_shopify_exchanging'] } },
      data: { status: 'cancelled', consumedAt: new Date() } });
      await tx.whatsAppShopifyWebhookSync.updateMany({ where: { businessId: account.businessId, integrationId: account.id },
        data: { status: 'failed', leaseOwner: null, leaseExpiresAt: null, lastErrorCode: 'SHOPIFY_INTEGRATION_DISCONNECTED' } });
      await writeWhatsAppAuditLog({ businessId: account.businessId, action: 'retail.shopify.uninstalled', targetType: 'commerce_integration', targetId: account.id, outcome: 'success', database: tx });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
