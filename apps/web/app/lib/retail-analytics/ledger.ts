/** Provider adapters must emit posted financial events, not order-status changes.
 * Monetary amounts are integer minor units, excluding tax unless stated.
 * Authorization must resolve businessId on the server before calling this module.
 */
export type RetailEvent = {
  businessId: string;
  accountId: string;
  provider: "shopify" | "foodics" | "icg";
  eventId: string;
  occurredAt: string;
  currency: string;
  kind: "sale" | "refund";
  grossMinor: number;
  discountMinor: number;
  taxMinor: number;
  /** Actual cost of sold/returned goods, never inferred from selling price. */
  costMinor: number | null;
};

export type RetailTotals = {
  currency: string;
  grossSalesMinor: number;
  discountsMinor: number;
  returnsMinor: number;
  netSalesMinor: number;
  netTaxMinor: number;
  grossProfitMinor: number | null;
  missingCostEvents: number;
  eventCount: number;
};

export function summarizeRetailEvents(
  events: readonly RetailEvent[],
  scope: { businessId: string; accountIds: readonly string[]; from: string; until: string },
): RetailTotals[] {
  const from = Date.parse(scope.from), until = Date.parse(scope.until);
  if (!scope.businessId || !Number.isFinite(from) || !Number.isFinite(until) || from >= until) {
    throw new Error("INVALID_RETAIL_SCOPE");
  }
  const accounts = new Set(scope.accountIds);
  const seen = new Map<string, string>();
  const totals = new Map<string, RetailTotals & { cost: number }>();
  const add = (a: number, b: number) => {
    const sum = a + b;
    if (!Number.isSafeInteger(sum)) throw new Error("RETAIL_AMOUNT_OVERFLOW");
    return sum;
  };
  for (const event of events) {
    // Fail closed rather than silently displaying a partially scoped dataset.
    if (event.businessId !== scope.businessId || !accounts.has(event.accountId)) {
      throw new Error("RETAIL_SCOPE_MISMATCH");
    }
    const time = Date.parse(event.occurredAt);
    if (!event.eventId || !event.accountId || !Number.isFinite(time)
      || !/^[A-Z]{3}$/.test(event.currency)
      || !["shopify", "foodics", "icg"].includes(event.provider)
      || !["sale", "refund"].includes(event.kind)
      || [event.grossMinor, event.discountMinor, event.taxMinor, ...(event.costMinor === null ? [] : [event.costMinor])]
        .some(value => !Number.isSafeInteger(value) || value < 0)
      || event.discountMinor > event.grossMinor) throw new Error("INVALID_RETAIL_EVENT");
    const key = JSON.stringify([event.provider, event.accountId, event.eventId]);
    const fingerprint = JSON.stringify([time, event.currency, event.kind, event.grossMinor, event.discountMinor, event.taxMinor, event.costMinor]);
    const previous = seen.get(key);
    if (previous !== undefined) {
      if (previous !== fingerprint) throw new Error("CONFLICTING_RETAIL_EVENT");
      continue;
    }
    seen.set(key, fingerprint);
    if (time < from || time >= until) continue;
    const total = totals.get(event.currency) ?? {
      currency: event.currency, grossSalesMinor: 0, discountsMinor: 0, returnsMinor: 0,
      netSalesMinor: 0, netTaxMinor: 0, grossProfitMinor: null, missingCostEvents: 0,
      eventCount: 0, cost: 0,
    };
    const sign = event.kind === "sale" ? 1 : -1;
    const net = event.grossMinor - event.discountMinor;
    if (event.kind === "sale") {
      total.grossSalesMinor = add(total.grossSalesMinor, event.grossMinor);
      total.discountsMinor = add(total.discountsMinor, event.discountMinor);
    } else total.returnsMinor = add(total.returnsMinor, net);
    total.netSalesMinor = add(total.netSalesMinor, sign * net);
    total.netTaxMinor = add(total.netTaxMinor, sign * event.taxMinor);
    if (event.costMinor === null) total.missingCostEvents++;
    else total.cost = add(total.cost, sign * event.costMinor);
    total.eventCount++;
    totals.set(event.currency, total);
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)).map(({ cost, ...total }) => ({
    ...total,
    grossProfitMinor: total.missingCostEvents ? null : add(total.netSalesMinor, -cost),
  }));
}
