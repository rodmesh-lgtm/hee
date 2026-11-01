import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from '../db';
import { decryptCommerceCredential, type CommerceCredentialEnvelope } from '../whatsapp/commerce-credential-envelope';
import { writeWhatsAppAuditLog } from '../whatsapp/audit';
import { retailProvider } from './oauth-domain';
import { revokeRetailProvider } from './revoke-provider';

export async function disconnectRetailAccount(input: { businessId: string; userId: string; integrationId: string }) {
  const record = await db.$transaction(async tx => {
    const owner = await tx.business.count({ where: { id: input.businessId, ownerId: input.userId, deletedAt: null, owner: { deletedAt: null, deactivatedAt: null } } });
    if (owner !== 1) throw new Error('FORBIDDEN');
    const integration = await tx.whatsAppCommerceIntegration.findFirst({ where: { id: input.integrationId, businessId: input.businessId, provider: { in: ['shopify', 'foodics'] } } });
    if (!integration) throw new Error('ACCOUNT_UNAVAILABLE');
    await tx.whatsAppCommerceOAuthSession.updateMany({ where: { businessId: input.businessId, integrationId: integration.id, status: { in: ['created', 'exchanging', 'retail_shopify_created', 'retail_shopify_exchanging', 'retail_foodics_created', 'retail_foodics_exchanging'] } }, data: { status: 'cancelled', consumedAt: new Date() } });
    await tx.whatsAppShopifyWebhookSync.updateMany({ where: { businessId: input.businessId, integrationId: integration.id }, data: { status: 'failed', leaseOwner: null, leaseExpiresAt: null, lastErrorCode: 'SHOPIFY_INTEGRATION_DISCONNECTED' } });
    // Block reads first. Preserve encrypted credentials until provider revocation is confirmed.
    await tx.whatsAppCommerceIntegration.updateMany({ where: { id: integration.id, businessId: input.businessId }, data: { status: integration.credentialEnvelope ? 'revocation_pending' : 'disconnected', disconnectedAt: new Date(), lastErrorCode: integration.credentialEnvelope ? 'PROVIDER_REVOCATION_PENDING' : null } });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.userId, action: 'retail.disconnect.request', targetType: 'commerce_integration', targetId: integration.id, outcome: 'success', database: tx });
    return integration;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (!record.credentialEnvelope) return 'disconnected' as const;
  try {
    const provider = retailProvider(record.provider);
    const credential = JSON.parse(decryptCommerceCredential({ envelope: record.credentialEnvelope as CommerceCredentialEnvelope, encryptionKeyBase64: process.env.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY ?? '', businessId: input.businessId, integrationId: record.id, provider })) as { accessToken?: unknown; environment?: unknown };
    if (typeof credential.accessToken !== 'string') throw new Error('INVALID_CREDENTIAL');
    await revokeRetailProvider({ provider, token: credential.accessToken, externalId: record.externalStoreId, environment: typeof credential.environment === 'string' ? credential.environment : undefined, apiVersion: process.env.SHOPIFY_ADMIN_API_VERSION });
    const changed = await db.whatsAppCommerceIntegration.updateMany({ where: { id: record.id, businessId: input.businessId, provider, status: 'revocation_pending' }, data: { status: 'disconnected', credentialEnvelope: Prisma.DbNull, lastErrorCode: null } });
    if (changed.count !== 1) throw new Error('STATE_CHANGED');
    return 'disconnected' as const;
  } catch {
    return 'revocation-pending' as const;
  }
}
