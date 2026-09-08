export type WorkHealth = "on_track" | "at_risk" | "blocked";
export type WorkPriority = "low" | "normal" | "high" | "urgent";

export type WorkPriorityInput = {
  id: string;
  kind: "reminder" | "note";
  scheduledAt?: Date | null;
  businessDueAt?: Date | null;
  workHealth: WorkHealth | string;
  priority: WorkPriority | string;
  responsiblePerson?: string | null;
  nextAction?: string | null;
  progressPercent?: number | null;
  updatedAt?: Date | null;
};

export type WorkPriorityReason =
  | "overdue_reminder"
  | "blocked"
  | "at_risk"
  | "business_due"
  | "urgent"
  | "high_priority"
  | "assigned_due"
  | "next_action"
  | "scheduled"
  | "recent_note";

export type RankedWork<T extends WorkPriorityInput> = T & {
  rank: number;
  reason: WorkPriorityReason;
};

function isOpen(item: WorkPriorityInput) {
  return Math.max(0, Math.min(100, item.progressPercent ?? 0)) < 100;
}

function isPast(value: Date | null | undefined, now: Date) {
  return Boolean(value && value.getTime() < now.getTime());
}

export function rankWorkItem<T extends WorkPriorityInput>(item: T, now = new Date()): RankedWork<T> {
  const open = isOpen(item);
  const overdueReminder = open && item.kind === "reminder" && isPast(item.scheduledAt, now);
  const overdueBusinessDue = open && isPast(item.businessDueAt, now);

  // Rank bands are intentionally spaced so future refinements can be inserted
  // without changing the established ordering contract.
  if (overdueReminder) return { ...item, rank: 1000, reason: "overdue_reminder" };
  if (open && item.workHealth === "blocked") return { ...item, rank: 900, reason: "blocked" };
  if (open && item.workHealth === "at_risk") return { ...item, rank: 800, reason: "at_risk" };
  if (overdueBusinessDue) return { ...item, rank: 750, reason: "business_due" };
  if (open && item.priority === "urgent") return { ...item, rank: 700, reason: "urgent" };
  if (open && item.priority === "high") return { ...item, rank: 650, reason: "high_priority" };
  if (open && item.responsiblePerson && item.businessDueAt) return { ...item, rank: 600, reason: "assigned_due" };
  if (open && item.nextAction?.trim()) return { ...item, rank: 500, reason: "next_action" };
  if (open && item.kind === "reminder" && item.scheduledAt) return { ...item, rank: 400, reason: "scheduled" };
  return { ...item, rank: 100, reason: "recent_note" };
}

function tieTime(item: WorkPriorityInput) {
  return item.businessDueAt?.getTime() ?? item.scheduledAt?.getTime() ?? item.updatedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

export function prioritizeWork<T extends WorkPriorityInput>(items: readonly T[], now = new Date()): RankedWork<T>[] {
  return items
    .map((item) => rankWorkItem(item, now))
    .sort((a, b) => b.rank - a.rank || tieTime(a) - tieTime(b) || a.id.localeCompare(b.id));
}
