import 'server-only';
import { db } from '../db';
import { getShopifyConfig } from '../whatsapp/shopify-config';
import { decryptCommerceCredential, type CommerceCredentialEnvelope } from '../whatsapp/commerce-credential-envelope';
import { fetchShopifyRetailReport, type ReportPeriod } from './shopify-report';

export async function readConnectedShopifyReport(businessId: string, integrationId: string, period: ReportPeriod) {
  const integration = await db.whatsAppCommerceIntegration.findFirst({
    where: { id: integrationId, businessId, provider: 'shopify', status: 'active' },
    select: { id: true, externalStoreId: true, credentialEnvelope: true },
  });
  if (!integration?.credentialEnvelope) throw new Error('ACCOUNT_UNAVAILABLE');
  const config = getShopifyConfig();
  const credential = JSON.parse(decryptCommerceCredential({
    envelope: integration.credentialEnvelope as CommerceCredentialEnvelope,
    encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
    businessId, integrationId: integration.id, provider: 'shopify',
  })) as { accessToken?: unknown; accessTokenExpiresAt?: unknown; scopes?: unknown };
  if (typeof credential.accessToken !== 'string' || credential.accessToken.length < 16) throw new Error('REAUTHORIZE_REQUIRED');
  if (credential.accessTokenExpiresAt !== null && credential.accessTokenExpiresAt !== undefined) {
    const expiry = typeof credential.accessTokenExpiresAt === 'string' ? Date.parse(credential.accessTokenExpiresAt) : NaN;
    if (!Number.isFinite(expiry) || expiry <= Date.now() + 60000) throw new Error('REAUTHORIZE_REQUIRED');
  }
  const result = await fetchShopifyRetailReport({ shop: integration.externalStoreId, token: credential.accessToken, apiVersion: config.SHOPIFY_ADMIN_API_VERSION, period });
  // Revocation during the provider call must prevent disclosure of the resulting report.
  const stillActive = await db.whatsAppCommerceIntegration.count({ where: { id: integration.id, businessId, status: 'active', provider: 'shopify' } });
  if (!stillActive) throw new Error('ACCOUNT_UNAVAILABLE');
  return result;
}
