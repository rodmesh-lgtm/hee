/** Only known section identifiers are persisted; new sections retain their default order. */
export function orderDashboardItems<T extends { href: string }>(items: readonly T[], order: readonly string[]): T[] {
  const remaining = new Map(items.map(item => [item.href, item]));
  const result: T[] = [];
  for (const savedHref of order) {
    const href = ["/Laundromat", "/Laundromat/Accounting", "/Laundromat/Operations", "/Laundromat/Delivery"].includes(savedHref) ? "/Accounting" : savedHref;
    const item = remaining.get(href);
    if (item) { result.push(item); remaining.delete(href); }
  }
  return [...result, ...remaining.values()];
}

export function validDashboardOrder(value: unknown, allowed: readonly string[]): value is string[] {
  return Array.isArray(value) && value.length <= allowed.length && new Set(value).size === value.length && value.every(item => typeof item === "string" && allowed.includes(item));
}

export function moveDashboardItem(order: readonly string[], source: string, target: string): string[] {
  const from = order.indexOf(source), to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return [...order];
  const result = [...order];
  result.splice(from, 1);
  result.splice(to, 0, source);
  return result;
}
