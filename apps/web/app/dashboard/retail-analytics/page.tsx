import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { getActiveBusinessForUser } from '../../lib/active-business';
import { getRequestLocale } from '../../lib/i18n-server';
import RetailWorkspace from './workspace';

export const dynamic = 'force-dynamic';
export default async function RetailAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Financial imports are owner-only; visitor analytics permission is insufficient.
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect('/dashboard');
  const english = await getRequestLocale() === 'en';
  return <RetailWorkspace key={business.id} businessId={business.id} businessName={business.name} english={english}/>;
}
