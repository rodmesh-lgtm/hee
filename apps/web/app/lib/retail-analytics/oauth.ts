import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '../db';
import { readBoundedJson } from '../request-body';
import { ensureRetailShopifySubscription } from './shopify-subscription';
import { shopifyAppOrigin } from '../whatsapp/shopify-config';
import { normalizeShopifyDomain } from '../whatsapp/shopify-domain';
import { encryptCommerceCredential } from '../whatsapp/commerce-credential-envelope';
import { writeWhatsAppAuditLog } from '../whatsapp/audit';
import { foodicsOrigins, retailAuthorizationUrl, verifyFoodicsIdentity, type RetailProvider } from './oauth-domain';

export function retailOAuthConfig(provider: RetailProvider, env: NodeJS.ProcessEnv = process.env) {
  const prefix = provider.toUpperCase();
  const clientId = env[`${prefix}_CLIENT_ID`]?.trim();
  const clientSecret = env[`${prefix}_CLIENT_SECRET`]?.trim();
  const key = env.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY ?? '';
  const keyVersion = env.WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION ?? '';
  if (!clientId || !clientSecret || Buffer.from(key, 'base64').length !== 32 || !/^[\w.-]{1,32}$/.test(keyVersion)) throw new Error('PROVIDER_NOT_CONFIGURED');
  const environment = provider === 'foodics' ? env.FOODICS_ENVIRONMENT ?? '' : '';
  if (provider === 'foodics') foodicsOrigins(environment);
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION ?? '';
  if (provider === 'shopify' && !/^20\d{2}-(01|04|07|10)$/.test(apiVersion)) throw new Error('PROVIDER_NOT_CONFIGURED');
  return { clientId, clientSecret, key, keyVersion, environment, apiVersion,
    callback: `${shopifyAppOrigin(env)}/api/retail-analytics/oauth/${provider}/callback` };
}
export function retailOAuthReady(provider: RetailProvider) { try { retailOAuthConfig(provider); return true; } catch { return false; } }
const digest = (state: string) => createHash('sha256').update(state).digest('hex');
const created = (provider: RetailProvider) => `retail_${provider}_created`;
const exchanging = (provider: RetailProvider) => `retail_${provider}_exchanging`;

export async function startRetailOAuth(input: { businessId: string; userId: string; provider: RetailProvider; shop?: string; integrationId?: string }) {
  const config = retailOAuthConfig(input.provider);
  const state = randomBytes(32).toString('base64url');
  const externalStoreId = input.provider === 'shopify' ? normalizeShopifyDomain(input.shop ?? '') : `pending:${randomUUID()}`;
  const now = new Date();
  await db.$transaction(async tx => {
    const owner = await tx.business.count({ where: { id: input.businessId, ownerId: input.userId, deletedAt: null, owner: { deletedAt: null, deactivatedAt: null } } });
    if (owner !== 1) throw new Error('FORBIDDEN');
    const existing = input.integrationId
      ? await tx.whatsAppCommerceIntegration.findFirst({ where: { id: input.integrationId, businessId: input.businessId, provider: input.provider } })
      : await tx.whatsAppCommerceIntegration.findUnique({ where: { businessId_provider_externalStoreId: { businessId: input.businessId, provider: input.provider, externalStoreId } } });
    if (input.integrationId && !existing) throw new Error('FORBIDDEN');
    if (existing && input.provider === 'shopify' && existing.externalStoreId !== externalStoreId) throw new Error('ACCOUNT_MISMATCH');
    if (existing?.status === 'active') throw new Error('ALREADY_CONNECTED');
    if (existing && !['draft', 'disconnected'].includes(existing.status)) throw new Error('REVOCATION_PENDING');
    const integration = existing ?? await tx.whatsAppCommerceIntegration.create({ data: { businessId: input.businessId, provider: input.provider, externalStoreId } });
    await tx.whatsAppCommerceOAuthSession.updateMany({ where: { businessId: input.businessId, integrationId: integration.id, status: { in: [created(input.provider), exchanging(input.provider)] } }, data: { status: 'cancelled', consumedAt: now } });
    await tx.whatsAppCommerceOAuthSession.create({ data: { businessId: input.businessId, integrationId: integration.id, initiatedByUserId: input.userId, stateDigest: digest(state), status: created(input.provider), expiresAt: new Date(now.getTime() + 600000) } });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.userId, action: 'retail.oauth.start', targetType: 'commerce_integration', targetId: integration.id, outcome: 'success', database: tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return retailAuthorizationUrl({ provider: input.provider, clientId: config.clientId, state, callback: config.callback, shop: input.shop, environment: config.environment });
}
async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('PROVIDER_AUTHORIZATION_FAILED');
  return readBoundedJson(response, 256 * 1024);
}
export async function finishRetailOAuth(input: { businessId: string; userId: string; provider: RetailProvider; state: string; code: string; shop?: string }) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(input.state) || input.code.length < 8 || input.code.length > 8192) throw new Error('INVALID_CALLBACK');
  const config = retailOAuthConfig(input.provider);
  const now = new Date();
  const session = await db.$transaction(async tx => {
    const record = await tx.whatsAppCommerceOAuthSession.findFirst({ where: { stateDigest: digest(input.state), businessId: input.businessId, initiatedByUserId: input.userId, status: created(input.provider), expiresAt: { gt: now }, integration: { provider: input.provider, status: { in: ['draft', 'disconnected'] } } }, include: { integration: { select: { externalStoreId: true } } } });
    if (!record) throw new Error('OAUTH_SESSION_EXPIRED');
    if (input.provider === 'shopify' && record.integration.externalStoreId !== normalizeShopifyDomain(input.shop ?? '')) throw new Error('ACCOUNT_MISMATCH');
    const owner = await tx.business.count({ where: { id: input.businessId, ownerId: input.userId, deletedAt: null, owner: { deletedAt: null, deactivatedAt: null } } });
    if (owner !== 1) throw new Error('FORBIDDEN');
    if (input.provider === 'shopify') {
      const collision = await tx.whatsAppCommerceIntegration.count({ where: { provider: 'shopify', externalStoreId: record.integration.externalStoreId, id: { not: record.integrationId } } });
      if (collision) throw new Error('ACCOUNT_ALREADY_ASSIGNED');
    }
    const claimed = await tx.whatsAppCommerceOAuthSession.updateMany({ where: { id: record.id, status: created(input.provider) }, data: { status: exchanging(input.provider) } });
    if (claimed.count !== 1) throw new Error('OAUTH_SESSION_EXPIRED');
    return record;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  try {
    const origin = input.provider === 'shopify' ? `https://${session.integration.externalStoreId}/admin` : foodicsOrigins(config.environment).api;
    const token = await jsonRequest(`${origin}${input.provider === 'shopify' ? '/oauth/access_token' : '/oauth/token'}`, {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.callback, code: input.code }),
    });
    if (!token || typeof token !== 'object' || Array.isArray(token)) throw new Error('PROVIDER_TOKEN_INVALID');
    const tokenRecord = token as Record<string, unknown>;
    if (typeof tokenRecord.access_token !== 'string' || tokenRecord.access_token.length < 16) throw new Error('PROVIDER_TOKEN_INVALID');
    let identity: { externalId: string; name: string; scopes: string[] };
    if (input.provider === 'foodics') {
      if (tokenRecord.token_type !== 'Bearer') throw new Error('PROVIDER_TOKEN_INVALID');
      identity = verifyFoodicsIdentity(await jsonRequest(`${foodicsOrigins(config.environment).api}/v5/whoami`, { headers: { Authorization: `Bearer ${tokenRecord.access_token}`, Accept: 'application/json' } }));
      identity.externalId = `${config.environment}:${identity.externalId}`;
      if (!session.integration.externalStoreId.startsWith('pending:') && session.integration.externalStoreId !== identity.externalId) throw new Error('ACCOUNT_MISMATCH');
    } else {
      if (typeof tokenRecord.scope !== 'string' || !tokenRecord.scope.split(',').map((s: string) => s.trim()).includes('read_orders')) throw new Error('PROVIDER_SCOPES_MISSING');
      const response = await jsonRequest(`${origin}/api/${config.apiVersion}/graphql.json`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-shopify-access-token': tokenRecord.access_token }, body: JSON.stringify({ query: '{ shop { myshopifyDomain name } }' }) });
      const shopResponse = response as { errors?: unknown[]; data?: { shop?: { myshopifyDomain?: unknown; name?: unknown } } } | null;
      if (!shopResponse || shopResponse.errors?.length || shopResponse.data?.shop?.myshopifyDomain !== session.integration.externalStoreId || typeof shopResponse.data?.shop?.name !== 'string') throw new Error('ACCOUNT_MISMATCH');
      identity = { externalId: session.integration.externalStoreId, name: shopResponse.data.shop.name.slice(0, 160), scopes: tokenRecord.scope.split(',') };
    }
    if (input.provider === 'shopify') {
      // Lifecycle delivery must be configured before the dashboard reports connected.
      await ensureRetailShopifySubscription({ shop: identity.externalId, token: tokenRecord.access_token, apiVersion: config.apiVersion });
    }
    const credential = encryptCommerceCredential({ plaintext: JSON.stringify({ accessToken: tokenRecord.access_token, scopes: identity.scopes, environment: config.environment, refreshToken: tokenRecord.refresh_token ?? null, accessTokenExpiresAt: typeof tokenRecord.expires_in === 'number' && tokenRecord.expires_in > 0 ? new Date(Date.now() + tokenRecord.expires_in * 1000).toISOString() : null }), encryptionKeyBase64: config.key, keyVersion: config.keyVersion, businessId: input.businessId, integrationId: session.integrationId, provider: input.provider });
    await db.$transaction(async tx => {
      const owner = await tx.business.count({ where: { id: input.businessId, ownerId: input.userId, deletedAt: null, owner: { deletedAt: null, deactivatedAt: null } } });
      if (owner !== 1) throw new Error('FORBIDDEN');
      const pending = await tx.whatsAppCommerceOAuthSession.count({ where: { id: session.id, businessId: input.businessId, status: exchanging(input.provider), expiresAt: { gt: new Date() } } });
      if (pending !== 1) throw new Error('OAUTH_SESSION_EXPIRED');
      const collision = await tx.whatsAppCommerceIntegration.count({ where: { provider: input.provider, externalStoreId: identity.externalId, id: { not: session.integrationId } } });
      if (collision) throw new Error('ACCOUNT_ALREADY_ASSIGNED');
      const changed = await tx.whatsAppCommerceIntegration.updateMany({ where: { id: session.integrationId, businessId: input.businessId, provider: input.provider, status: { in: ['draft', 'disconnected'] } }, data: { externalStoreId: identity.externalId, displayName: identity.name, status: 'active', connectedAt: now, disconnectedAt: null, credentialEnvelope: credential as Prisma.InputJsonValue, lastErrorCode: null } });
      if (changed.count !== 1) throw new Error('ACCOUNT_MISMATCH');
      await tx.whatsAppCommerceOAuthSession.update({ where: { id: session.id }, data: { status: 'connected', consumedAt: new Date() } });
      await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.userId, action: 'retail.oauth.complete', targetType: 'commerce_integration', targetId: session.integrationId, outcome: 'success', database: tx });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    await db.whatsAppCommerceOAuthSession.updateMany({ where: { id: session.id, businessId: input.businessId, status: exchanging(input.provider) }, data: { status: 'failed', consumedAt: new Date(), lastErrorCode: 'RETAIL_AUTHORIZATION_FAILED' } });
    throw new Error('RETAIL_AUTHORIZATION_FAILED');
  }
}
