// The caller must supply only accounts authorized for the current business/provider.
export function resolveAccountSelection(requested: string | string[] | undefined, accounts: readonly { id: string; status: string }[]) {
  if (requested === undefined) return 'all';
  if (typeof requested !== 'string' || !accounts.some(account => account.id === requested && account.status === 'active')) throw new Error('ACCOUNT_UNAVAILABLE');
  return requested;
}

/** Inventory has no cross-account aggregation; only "all" may select the first active account. */
export function inventoryAccountSelection(selected: string, accounts: readonly { id: string; status: string }[]) {
  if (selected === 'all') return accounts.find(account => account.status === 'active')?.id ?? '';
  return accounts.some(account => account.id === selected && account.status === 'active') ? selected : '';
}
