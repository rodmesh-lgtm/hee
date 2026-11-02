import { normalizeShopifyDomain } from '../whatsapp/shopify-domain';
import { readBoundedJson } from '../request-body';
import { foodicsOrigins, type RetailProvider } from './oauth-domain';

// An uncertain provider response never becomes a successful revocation.
export async function revokeRetailProvider(input: {
  provider: RetailProvider; token: string; externalId: string; environment?: string; apiVersion?: string;
}, fetcher: typeof fetch = fetch) {
  if (!input.token || input.token.length < 16) throw new Error('REVOCATION_CREDENTIAL_INVALID');
  let url: string;
  let init: RequestInit;
  if (input.provider === 'foodics') {
    const environment = input.environment ?? '';
    const origins = foodicsOrigins(environment);
    if (!input.externalId.startsWith(`${environment}:`)) throw new Error('ACCOUNT_MISMATCH');
    url = `${origins.api}/v5/tokens/client`;
    init = { method: 'DELETE', headers: { Authorization: `Bearer ${input.token}`, Accept: 'application/json' } };
  } else {
    if (!/^20\d{2}-(01|04|07|10)$/.test(input.apiVersion ?? '')) throw new Error('REVOCATION_CONFIG_INVALID');
    url = `https://${normalizeShopifyDomain(input.externalId)}/admin/api/${input.apiVersion}/graphql.json`;
    init = { method: 'POST', headers: { 'content-type': 'application/json', 'x-shopify-access-token': input.token }, body: JSON.stringify({ query: 'mutation InfroDisconnect { appUninstall { app { id } userErrors { field message } } }' }) };
  }
  const response = await fetcher(url, { ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000) });
  // This credential has already lost authorization. No token is exposed in the result.
  if (response.status === 401) return;
  if (response.status !== 200) throw new Error('PROVIDER_REVOCATION_PENDING');
  if (input.provider === 'foodics') return;
  const payload = await readBoundedJson(response, 64 * 1024) as { errors?: unknown[]; data?: { appUninstall?: { app?: { id?: string }; userErrors?: unknown[] } } };
  const result = payload.data?.appUninstall;
  if (payload.errors?.length || !result?.app?.id || !Array.isArray(result.userErrors) || result.userErrors.length) throw new Error('PROVIDER_REVOCATION_PENDING');
}
