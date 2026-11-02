import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from '../db';
import { revokeRetailProvider } from './revoke-provider';
import type { RetailProvider } from './oauth-domain';

/** The token was already persisted encrypted in an unavailable account. */
export async function recoverFailedRetailAuthorization(input: {
  businessId: string; integrationId: string; provider: RetailProvider; token: string;
  externalId: string | null; environment: string; apiVersion: string;
}) {
  const ready = await db.$transaction(async tx => {
    const collision = !input.externalId || await tx.whatsAppCommerceIntegration.count({ where: {
      provider: input.provider, externalStoreId: input.externalId, id: { not: input.integrationId },
    } });
    // Revoking a whole app/client could affect another account. Retain the encrypted
    // credential for review instead of revoking when its ownership is uncertain.
    const changed = await tx.whatsAppCommerceIntegration.updateMany({ where: {
      id: input.integrationId, businessId: input.businessId, provider: input.provider, status: 'authorizing',
    }, data: { status: collision ? 'authorization_review_required' : 'revocation_pending',
      lastErrorCode: collision ? 'AUTHORIZATION_RECOVERY_REVIEW' : 'PROVIDER_REVOCATION_PENDING',
      ...(input.externalId && !collision ? { externalStoreId: input.externalId } : {}),
    } });
    return changed.count === 1 && !collision;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (!ready || !input.externalId) return;
  try {
    await revokeRetailProvider({ ...input, externalId: input.externalId });
    await db.whatsAppCommerceIntegration.updateMany({ where: {
      id: input.integrationId, businessId: input.businessId, provider: input.provider, status: 'revocation_pending',
    }, data: { status: 'disconnected', disconnectedAt: new Date(), credentialEnvelope: Prisma.DbNull, lastErrorCode: null } });
  } catch {
    // The encrypted token remains unavailable to reporting and available to retry.
  }
}
