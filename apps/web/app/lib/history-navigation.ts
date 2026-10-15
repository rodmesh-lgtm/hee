export type HistoryParams = Record<string, string | string[] | undefined>;
export const HISTORY_PAGE_SIZE = 20;
// Keep navigation bounded even for very large histories, while exposing both ends.
export function historyPageLinks(page: number, pages: number): Array<number | "gap"> {
  const visible = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter(value => value >= 1 && value <= pages).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  for (const value of visible) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && value - previous > 1) result.push("gap");
    result.push(value);
  }
  return result;
}
export const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
export function historyQuery(params: HistoryParams) { return (firstParam(params.q) ?? "").normalize("NFKC").trim().slice(0, 120); }
export function historyPage(value: string | string[] | undefined, matching: number) {
  const requested = Number(firstParam(value));
  const pages = Math.max(1, Math.ceil(matching / HISTORY_PAGE_SIZE));
  return { page: Math.min(Number.isSafeInteger(requested) && requested > 0 ? requested : 1, pages), pages };
}
export function historyHref(path: string, filters: Record<string, string>, page = 1) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
  if (page > 1) query.set("page", String(page));
  return `${path}?${query.toString()}#history`;
}
