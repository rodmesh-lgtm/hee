import { NextResponse } from 'next/server';
import { getCurrentUserForApiWrite } from '../../../../../lib/auth';
import { getActiveBusinessForUser } from '../../../../../lib/active-business';
import { shopifyAppOrigin } from '../../../../../lib/whatsapp/shopify-config';
import { verifyShopifyOAuthHmac } from '../../../../../lib/whatsapp/shopify-domain';
import { callbackValue, retailProvider } from '../../../../../lib/retail-analytics/oauth-domain';
import { finishRetailOAuth, retailOAuthConfig } from '../../../../../lib/retail-analytics/oauth';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
function back(status: string) {
  const response = NextResponse.redirect(new URL(`/dashboard/retail-analytics?connection=${status}`, shopifyAppOrigin()));
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    const provider = retailProvider((await context.params).provider);
    const user = await getCurrentUserForApiWrite();
    if (!user) return back('login-required');
    const business = await getActiveBusinessForUser(user.id);
    if (!business) return back('forbidden');
    const params = new URL(request.url).searchParams;
    if (params.has('error')) return back('cancelled');
    const state = callbackValue(params, 'state'), code = callbackValue(params, 'code');
    const config = retailOAuthConfig(provider);
    let shop: string | undefined;
    if (provider === 'shopify') {
      if (!verifyShopifyOAuthHmac(params, config.clientSecret)) return back('invalid-callback');
      const timestamp = Number(callbackValue(params, 'timestamp'));
      if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp * 1000) > 600000) return back('expired');
      shop = callbackValue(params, 'shop');
    }
    await finishRetailOAuth({ businessId: business.id, userId: user.id, provider, state, code, shop });
    return back('connected');
  } catch { return back('failed'); }
}
