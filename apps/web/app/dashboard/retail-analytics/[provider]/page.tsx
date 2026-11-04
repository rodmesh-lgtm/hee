import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth';
import { getActiveBusinessForUser } from '../../../lib/active-business';
import { getRequestLocale } from '../../../lib/i18n-server';
import ConnectedRetailWorkspace from '../connected-workspace';
import { db } from '../../../lib/db';
import { resolveAccountSelection } from '../../../lib/retail-analytics/account-selection';
import { retailOAuthReady } from '../../../lib/retail-analytics/oauth';

export const dynamic = 'force-dynamic';
export default async function RetailAnalyticsPage({ searchParams, params }: { params: Promise<{ provider: string }>; searchParams: Promise<{ connection?: string; account?: string | string[] }> }) {
  const { provider } = await params;
  if (!['shopify', 'foodics', 'icg'].includes(provider)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Financial report access requires explicit membership permission and a current paid seat.
  const business = await getActiveBusinessForUser(user.id, "businessAnalytics");
  if (!business) redirect('/dashboard');
  const english = await getRequestLocale() === 'en';
  const accounts = await db.whatsAppCommerceIntegration.findMany({
    where: { businessId: business.id, provider },
    select: { provider: true, id: true, displayName: true, externalStoreId: true, status: true },
    orderBy: { createdAt: 'asc' },
  });
  const query = await searchParams;
  let initialAccountId: string;
  try { initialAccountId = resolveAccountSelection(query.account, accounts); } catch { notFound(); }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return <ConnectedRetailWorkspace canManage={business.ownerId === user.id} key={`${business.id}:${provider}:${initialAccountId}`} initialAccountId={initialAccountId} provider={provider as 'shopify' | 'foodics' | 'icg'} businessId={business.id} businessName={business.name} english={english} accounts={accounts} configured={retailOAuthReady('shopify')} foodicsConfigured={retailOAuthReady('foodics')} connectionStatus={query.connection ?? ''} today={today}/>;
}
