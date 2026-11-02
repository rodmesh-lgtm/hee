// The caller must supply only accounts authorized for the current business/provider.
export function resolveAccountSelection(requested: string | string[] | undefined, accounts: readonly { id: string; status: string }[]) {
  if (requested === undefined) return 'all';
  if (typeof requested !== 'string' || !accounts.some(account => account.id === requested && account.status === 'active')) throw new Error('ACCOUNT_UNAVAILABLE');
  return requested;
}
