import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

export const SUPPORT_CATEGORIES: Record<string, string> = {
  account: "الحساب", billing: "الباقات والفوترة", technical: "مشكلة تقنية",
  privacy: "الخصوصية والبيانات", other: "أخرى",
};
const PAGE_SIZE = 20;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export async function readSupportHistory(
  scope: { businessId: string; eventType: "support_requested" },
  params: Record<string, string | string[] | undefined> = {},
) {
  const query = (first(params.q) ?? "").trim().slice(0, 120);
  const rawStatus = first(params.status);
  const status = rawStatus === "open" || rawStatus === "resolved" ? rawStatus : "all";
  const rawCategory = first(params.category) ?? "";
  const category = Object.hasOwn(SUPPORT_CATEGORIES, rawCategory) ? rawCategory : "all";
  const rawPage = Number(first(params.page));
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  // Read only customer-visible fields. Never search internal operator identities or notes.
  const filters = [Prisma.sql`TRUE`];
  if (status === "resolved") filters.push(Prisma.sql`metadata->>'status' = 'resolved'`);
  if (status === "open") filters.push(Prisma.sql`COALESCE(metadata->>'status', 'open') <> 'resolved'`);
  if (category !== "all") filters.push(Prisma.sql`COALESCE(metadata->>'category', 'other') = ${category}`);
  if (query) filters.push(Prisma.sql`(
    POSITION(LOWER(${query}) IN LOWER(COALESCE(metadata->>'subject', ''))) > 0 OR
    POSITION(LOWER(${query}) IN LOWER(COALESCE(metadata->>'message', ''))) > 0 OR
    (metadata->>'status' = 'resolved' AND POSITION(LOWER(${query}) IN LOWER(COALESCE(metadata->>'resolutionNote', ''))) > 0) OR
    POSITION(LOWER(${query}) IN LOWER(id)) > 0
  )`);
  const filter = Prisma.join(filters, " AND ");
  const tenant = Prisma.sql`"businessId" = ${scope.businessId} AND "eventType" = ${scope.eventType}`;
  return db.$transaction(async tx => {
    const [counts] = await tx.$queryRaw<Array<{ total: bigint; resolved: bigint; matching: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE metadata->>'status' = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE ${filter}) AS matching
      FROM "AnalyticsEvent" WHERE ${tenant}
    `);
    const total = Number(counts.total), resolved = Number(counts.resolved), matching = Number(counts.matching);
    const pages = Math.max(1, Math.ceil(matching / PAGE_SIZE));
    const page = Math.min(requestedPage, pages);
    const tickets = await tx.$queryRaw<Array<{ id: string; createdAt: Date; metadata: Prisma.JsonValue }>>(Prisma.sql`
      SELECT id, "createdAt", metadata FROM "AnalyticsEvent"
      WHERE ${tenant} AND ${filter}
      ORDER BY "createdAt" DESC, id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
    `);
    return { query, status, category, page, pages, total, resolved, open: total - resolved, matching, tickets };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
