import { normalizeShopifyDomain } from '../whatsapp/shopify-domain';
import { readBoundedJson } from '../request-body';

const TOPIC = 'APP_UNINSTALLED';
export const RETAIL_UNINSTALL_URI = 'https://ir.sa/api/retail-analytics/shopify/uninstalled';
type Subscription = { id?: unknown; topic?: unknown; uri?: unknown };
type Payload = { errors?: unknown[]; data?: {
  webhookSubscriptions?: { nodes?: Subscription[]; pageInfo?: { hasNextPage?: boolean } };
  webhookSubscriptionCreate?: { webhookSubscription?: Subscription; userErrors?: unknown[] };
} };

/** Registers only the minimal lifecycle event; never order/customer payloads. */
export async function ensureRetailShopifySubscription(input: { shop: string; token: string; apiVersion: string }, fetcher: typeof fetch = fetch) {
  const shop = normalizeShopifyDomain(input.shop);
  if (!/^20\d{2}-(01|04|07|10)$/.test(input.apiVersion) || input.token.length < 16) throw new Error('WEBHOOK_CONFIG_INVALID');
  async function graphql(query: string, variables: Record<string, unknown>) {
    const response = await fetcher(`https://${shop}/admin/api/${input.apiVersion}/graphql.json`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-shopify-access-token': input.token },
      body: JSON.stringify({ query, variables }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('WEBHOOK_REGISTRATION_FAILED');
    const result = await readBoundedJson(response, 64 * 1024) as Payload;
    if (!result || result.errors?.length || !result.data) throw new Error('WEBHOOK_REGISTRATION_FAILED');
    return result.data;
  }
  const existing = (await graphql('query RetailUninstallSubscriptions($topics: [WebhookSubscriptionTopic!], $uri: String) { webhookSubscriptions(first: 50, topics: $topics, uri: $uri) { nodes { id topic uri } pageInfo { hasNextPage } } }', { topics: [TOPIC], uri: RETAIL_UNINSTALL_URI })).webhookSubscriptions;
  if (!existing || !Array.isArray(existing.nodes) || typeof existing.pageInfo?.hasNextPage !== 'boolean') throw new Error('WEBHOOK_REGISTRATION_FAILED');
  const matches = (node: Subscription) => typeof node?.id === 'string' && node.id.length > 0 && node.topic === TOPIC && node.uri === RETAIL_UNINSTALL_URI;
  if (existing.nodes.some(matches)) return;
  // A truncated list is not evidence that the subscription is absent.
  if (existing.pageInfo.hasNextPage) throw new Error('WEBHOOK_REGISTRATION_INCOMPLETE');
  const result = (await graphql('mutation RetailUninstallSubscription($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) { webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) { webhookSubscription { id topic uri } userErrors { field message } } }', { topic: TOPIC, subscription: { uri: RETAIL_UNINSTALL_URI, format: 'JSON' } })).webhookSubscriptionCreate;
  if (!result || !Array.isArray(result.userErrors) || result.userErrors.length || !result.webhookSubscription || !matches(result.webhookSubscription)) throw new Error('WEBHOOK_REGISTRATION_FAILED');
}
