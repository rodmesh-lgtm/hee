import { Prisma } from "@prisma/client";
export type ShortLinkStats = {total:bigint;matching:bigint;active:bigint;clicks:bigint};
export function shortLinkStatsQuery(businessId:string,q:string) {
 return Prisma.sql`SELECT COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status='active') AS active,
  COALESCE(SUM(clicks),0)::bigint AS clicks,
  COUNT(*) FILTER (WHERE ${q}='' OR POSITION(LOWER(${q}) IN LOWER(title))>0
    OR POSITION(LOWER(${q}) IN LOWER(destination))>0 OR POSITION(${q} IN code)>0) AS matching
  FROM "BusinessShortLink" WHERE "businessId"=${businessId} AND status<>'deleted'`;
}
