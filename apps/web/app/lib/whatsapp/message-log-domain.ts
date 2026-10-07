export const MESSAGE_LOG_STATES = { all: "كل الحالات", received: "واردة", sent: "قبلتها Meta", delivered: "تم التسليم", read: "تمت القراءة", failed: "تعذر التسليم" } as const;
export type MessageLogState = keyof typeof MESSAGE_LOG_STATES;
export function messageLogFilters(params: Record<string, string | string[] | undefined>) {
  const first = (key: string) => { const value = params[key]; return Array.isArray(value) ? value[0] : value; };
  const status = first("status") ?? "all";
  const direction = first("direction") ?? "all";
  const days = Number(first("days"));
  const page = Number(first("page"));
  return { status: Object.hasOwn(MESSAGE_LOG_STATES, status) ? status as MessageLogState : "all" as const,
    direction: direction === "inbound" || direction === "outbound" ? direction : "all",
    days: [7, 30, 90].includes(days) ? days : 30,
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
    query: (first("q") ?? "").trim().slice(0, 80),
  };
}
