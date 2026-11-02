import { normalizeShopifyDomain } from '../whatsapp/shopify-domain';
export type RetailProvider = 'shopify' | 'foodics';
export function retailProvider(value: unknown): RetailProvider {
  if (value !== 'shopify' && value !== 'foodics') throw new Error('INVALID_PROVIDER');
  return value;
}
export function foodicsOrigins(environment: string) {
  if (environment === 'production') return { api: 'https://api.foodics.com', console: 'https://console.foodics.com' };
  if (environment === 'sandbox') return { api: 'https://api-sandbox.foodics.com', console: 'https://console-sandbox.foodics.com' };
  throw new Error('FOODICS_ENVIRONMENT_REQUIRED');
}
export function retailAuthorizationUrl(input: { provider: RetailProvider; clientId: string; state: string; callback: string; shop?: string; environment?: string }) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(input.state)) throw new Error('INVALID_STATE');
  const params = new URLSearchParams({ client_id: input.clientId, state: input.state });
  if (input.provider === 'foodics') return `${foodicsOrigins(input.environment ?? '').console}/authorize?${params}`;
  params.set('scope', 'read_orders');
  params.set('redirect_uri', input.callback);
  return `https://${normalizeShopifyDomain(input.shop ?? '')}/admin/oauth/authorize?${params}`;
}
export function verifyFoodicsIdentity(payload: unknown) {
  const p = payload as { data?: { business?: { id?: unknown; name?: unknown }; scopes?: unknown } };
  const identity = p?.data;
  if (!identity?.business || typeof identity.business.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity.business.id)
    || typeof identity.business.name !== 'string' || !Array.isArray(identity.scopes)
    || !['orders.list', 'general.read'].every(scope => (identity.scopes as unknown[]).includes(scope))) throw new Error('FOODICS_IDENTITY_OR_SCOPES_INVALID');
  return { externalId: identity.business.id, name: identity.business.name.slice(0, 160), scopes: identity.scopes.filter((s): s is string => typeof s === 'string') };
}
export function callbackValue(params: URLSearchParams, name: string) {
  const values = params.getAll(name);
  if (values.length !== 1 || !values[0]) throw new Error('INVALID_CALLBACK');
  return values[0];
}
