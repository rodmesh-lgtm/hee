import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { getActiveBusinessForUser } from '../../lib/active-business';
import { getRequestLocale } from '../../lib/i18n-server';
import ConnectedRetailWorkspace from './connected-workspace';
import { db } from '../../lib/db';
import { shopifyConfigured } from '../../lib/whatsapp/shopify-config';

export const dynamic = 'force-dynamic';
export default async function RetailAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Financial imports are owner-only; visitor analytics permission is insufficient.
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect('/dashboard');
  const english = await getRequestLocale() === 'en';
  const accounts = await db.whatsAppCommerceIntegration.findMany({
    where: { businessId: business.id, provider: 'shopify' },
    select: { id: true, displayName: true, externalStoreId: true, status: true },
    orderBy: { createdAt: 'asc' },
  });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return <ConnectedRetailWorkspace key={business.id} businessId={business.id} businessName={business.name} english={english} accounts={accounts} configured={shopifyConfigured()} today={today}/>;
}
