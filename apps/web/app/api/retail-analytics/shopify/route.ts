import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import { getActiveBusinessForUser } from '../../../lib/active-business';
import { consumePublicWriteLimit } from '../../../lib/rate-limit';
import { readConnectedShopifyReport } from '../../../lib/retail-analytics/shopify-server';
import { validateReportPeriod } from '../../../lib/retail-analytics/shopify-report';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;
function reply(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }); }
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return reply({ error: 'UNAUTHENTICATED' }, 401);
    const business = await getActiveBusinessForUser(user.id);
    const params = new URL(request.url).searchParams;
    if (!business || params.get('businessId') !== business.id) return reply({ error: 'WORKSPACE_CHANGED' }, 403);
    const id = params.get('accountId') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return reply({ error: 'INVALID_ACCOUNT' }, 400);
    const period = { from: params.get('from') ?? '', until: params.get('until') ?? '' };
    validateReportPeriod(period);
    const limit = await consumePublicWriteLimit({ scope: 'retail.shopify.read', businessId: business.id, identity: user.id, limit: 10, windowSeconds: 60 });
    if (!limit.allowed) return reply({ error: 'RATE_LIMITED' }, 429);
    const report = await readConnectedShopifyReport(business.id, id, period);
    const current = await getActiveBusinessForUser(user.id);
    if (!current || current.id !== business.id) return reply({ error: 'WORKSPACE_CHANGED' }, 403);
    return reply({ accountId: id, businessId: business.id, report });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'INVALID_PERIOD') return reply({ error: code }, 400);
    if (code === 'ACCOUNT_UNAVAILABLE') return reply({ error: code }, 404);
    const safe = ['REAUTHORIZE_REQUIRED', 'PROVIDER_RATE_LIMIT', 'PROVIDER_QUERY_FAILED', 'PROVIDER_PAGINATION_CHANGED'].includes(code) ? code : 'REPORT_UNAVAILABLE';
    return reply({ error: safe }, 503);
  }
}
