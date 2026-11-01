'use server';
import { redirect } from 'next/navigation';
import { getOwnedBusinessForWrite } from '../../lib/ownership';
import { syncWorkspaceBusinessPreference } from '../../lib/active-business';
import { consumePublicWriteLimit } from '../../lib/rate-limit';
import { retailProvider } from '../../lib/retail-analytics/oauth-domain';
import { startRetailOAuth } from '../../lib/retail-analytics/oauth';

export async function connectRetailAccount(form: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business || form.get('businessId') !== business.id) redirect('/dashboard/retail-analytics?connection=forbidden');
  let authorization: string;
  try {
    const provider = retailProvider(form.get('provider'));
    const limit = await consumePublicWriteLimit({ scope: 'retail.oauth.start', businessId: business.id, identity: business.ownerId, limit: 5, windowSeconds: 600 });
    if (!limit.allowed) throw new Error('RATE_LIMITED');
    await syncWorkspaceBusinessPreference(business.id);
    authorization = await startRetailOAuth({ businessId: business.id, userId: business.ownerId, provider, shop: String(form.get('shop') ?? ''), integrationId: String(form.get('integrationId') ?? '') || undefined });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const status = code === 'ALREADY_CONNECTED' ? 'already-connected' : code === 'PROVIDER_NOT_CONFIGURED' || code === 'FOODICS_ENVIRONMENT_REQUIRED' ? 'not-configured' : code === 'RATE_LIMITED' ? 'rate-limited' : 'failed';
    redirect(`/dashboard/retail-analytics?connection=${status}`);
  }
  redirect(authorization!);
}
