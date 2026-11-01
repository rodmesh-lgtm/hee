import { readBoundedText } from '../../../../lib/request-body';
import { normalizeShopifyDomain, verifyShopifyWebhookHmac } from '../../../../lib/whatsapp/shopify-domain';
import { handleRetailShopifyUninstalled } from '../../../../lib/retail-analytics/shopify-uninstalled';

const reply = (status: number) => Response.json({ ok: status === 200 }, { status, headers: { 'cache-control': 'no-store' } });
export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) return reply(503);
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return reply(415);
  let body: string;
  try { body = await readBoundedText(request, 128 * 1024); } catch { return reply(413); }
  if (!verifyShopifyWebhookHmac(body, request.headers.get('x-shopify-hmac-sha256'), secret)) return reply(401);
  if (request.headers.get('x-shopify-topic') !== 'app/uninstalled') return reply(400);
  let domain: string;
  try {
    const payload = JSON.parse(body) as { myshopify_domain?: unknown };
    if (typeof payload.myshopify_domain !== 'string') return reply(400);
    domain = normalizeShopifyDomain(payload.myshopify_domain);
    // The body is signed; headers alone must never select the tenant/store.
    if (domain !== normalizeShopifyDomain(request.headers.get('x-shopify-shop-domain') ?? '')) return reply(400);
  } catch { return reply(400); }
  try { await handleRetailShopifyUninstalled(domain); return reply(200); }
  catch { return reply(503); } // Shopify retries uncertain verification/database failures.
}
