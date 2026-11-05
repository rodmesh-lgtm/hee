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

// Backward-compatible preference envelope in User.dashboardNavOrder. The prefix
// cannot collide with route identifiers; it is never used for authorization.
const HIDDEN_PREFIX = "hidden:";
export function canHideDashboardItem(href: string): boolean {
  return !["/dashboard", "/dashboard/settings", "/dashboard/support"].includes(href);
}
export function hiddenDashboardItems(value: readonly string[]): string[] {
  return value.filter(item => item.startsWith(HIDDEN_PREFIX)).map(item => item.slice(HIDDEN_PREFIX.length)).filter(canHideDashboardItem);
}
export function dashboardPreferences(order: readonly string[], hidden: readonly string[]): string[] {
  return [...order.filter(item => !item.startsWith(HIDDEN_PREFIX)), ...[...new Set(hidden)].filter(canHideDashboardItem).map(item => HIDDEN_PREFIX + item)];
}
export function validDashboardPreferences(value: unknown, allowed: readonly string[]): value is string[] {
  if (!Array.isArray(value) || value.length > allowed.length * 2 || value.some(item => typeof item !== "string") || new Set(value).size !== value.length) return false;
  const order = value.filter(item => !item.startsWith(HIDDEN_PREFIX));
  const hidden = value.filter(item => item.startsWith(HIDDEN_PREFIX)).map(item => item.slice(HIDDEN_PREFIX.length));
  return validDashboardOrder(order, allowed) && hidden.every(item => allowed.includes(item) && canHideDashboardItem(item));
}
