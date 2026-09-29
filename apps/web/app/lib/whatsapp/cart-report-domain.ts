export const CART_STATES = { active: "نشطة", abandoned: "متروكة", recovered: "مستعادة", completed: "مكتملة" } as const;
export type CartState = keyof typeof CART_STATES;
export function cartReportFilters(params: Record<string, string | string[] | undefined>) {
  const state = typeof params.state === "string" && Object.hasOwn(CART_STATES, params.state) ? params.state as CartState : "all";
  const requestedDays = Number(params.days);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10000) : 1;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  return { state, days, page, query };
}
