import Link from "next/link";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import type { LaundryService, LaundryTicket } from "../lib/laundry-domain";
import { laundryFilter } from "../lib/laundry-domain";
import { laundryCustomerPhone } from "../lib/laundry-customer";
import { LaundryWorkspace } from "./workspace";
import "./laundry.css";
export async function AccountingWorkspacePage({searchParams,activity="laundry",basePath="/Laundromat"}:{searchParams:Promise<{q?:string;filter?:string}>;activity?:"laundry"|"general";basePath?:string}) {
  const user=await getCurrentUser();
  if(!user)return <main className="laundry-gate" dir="rtl"><p>INFRO / LAUNDRY</p><h1>مساحة عمل مغسلتك</h1><p>الطلبات والفواتير وبيانات العملاء محمية بحساب المنشأة.</p><Link href="/login">تسجيل الدخول</Link><p>بعد الدخول افتح <Link href="/Laundromat">كاشير المغسلة</Link>.</p></main>;
  const business=await getActiveBusinessForUser(user.id,"laundry");
  if(!business)return <main className="laundry-gate" dir="rtl"><h1>تحتاج صلاحية كاشير المغسلة</h1><p>اختر المنشأة من لوحة التحكم، أو اطلب من مالكها إتاحة قسم كاشير المغسلة لحسابك.</p><Link href="/dashboard">العودة إلى لوحة التحكم</Link></main>;
  const owner=business.ownerId===user.id;
  const params=await searchParams;
  const q=String(params.q??"").trim().slice(0,100);
  let normalizedPhone=q;
  try { normalizedPhone=laundryCustomerPhone(q); } catch {}
  const localPhone=normalizedPhone.startsWith("+9665")?`0${normalizedPhone.slice(4)}`:normalizedPhone;
  const filter=laundryFilter(params.filter);
  const pattern=`%${q.replace(/[\\%_]/g,"\\$&")}%`;
  const [services,tickets,totals,expenses]=await Promise.all([
    db.$queryRaw<LaundryService[]>`SELECT s.*,u.price AS "urgentPrice" FROM "LaundryService" s LEFT JOIN "LaundryService" u ON u.id='urgent:'||s.id AND u."businessId"=s."businessId" AND u.active=TRUE WHERE s."businessId"=${business.id} AND s.active=TRUE AND s.id NOT LIKE 'urgent:%' ORDER BY s.category,s.name`,
    db.$queryRaw<LaundryTicket[]>`SELECT "id","number","customerName","phone","items","total","paid","status","dueAt","notes","createdAt",(SELECT COALESCE(jsonb_agg(jsonb_build_object('method',c.method,'amount',c.amount) ORDER BY c.method),'[]'::jsonb) FROM (SELECT p.method,SUM(p.amount)::int AS amount FROM "LaundryPayment" p WHERE p."businessId"=${business.id} AND p."ticketId"="LaundryTicket".id GROUP BY p.method) c) AS collections,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'kind',s.kind,'originalAmount',s.amount,'usedAmount',COALESCE(used.amount,0),
       'remaining',s.amount-COALESCE((SELECT SUM(m.amount) FROM "LaundryPrepaidMovement" m WHERE m."businessId"=s."businessId" AND m."prepaidId"=s.id AND m.kind IN ('redeem','refund') AND m."createdAt"<=COALESCE(used.at,"LaundryTicket"."createdAt")),0),
       'unitsRemaining',CASE WHEN s.kind='credit' THEN NULL ELSE s."unitsIncluded"-COALESCE((SELECT SUM(m.units) FROM "LaundryPrepaidMovement" m WHERE m."businessId"=s."businessId" AND m."prepaidId"=s.id AND m.kind IN ('redeem','refund') AND m."createdAt"<=COALESCE(used.at,"LaundryTicket"."createdAt")),0) END) ORDER BY s.id),'[]'::jsonb)
     FROM "LaundryPrepaid" s LEFT JOIN LATERAL (SELECT MAX(m."createdAt") AS at,SUM(m.amount)::int AS amount FROM "LaundryPrepaidMovement" m JOIN "LaundryPayment" p ON p.id=m."paymentId" AND p."businessId"=m."businessId" WHERE m."businessId"=s."businessId" AND m."prepaidId"=s.id AND m.kind='redeem' AND p."ticketId"="LaundryTicket".id) used ON TRUE
     WHERE s."businessId"=${business.id} AND s."customerId"="LaundryTicket"."customerId" AND (used.at IS NOT NULL OR (s."createdAt"<="LaundryTicket"."createdAt" AND s."startsAt"<="LaundryTicket"."createdAt" AND s."expiresAt">"LaundryTicket"."createdAt"))) AS "subscriptionBalances" FROM "LaundryTicket" WHERE "businessId"=${business.id} AND ("customerName" ILIKE ${pattern} OR "phone" ILIKE ${pattern} OR "phone" IN (${normalizedPhone},${normalizedPhone.replace(/^\+/,"")},${localPhone}) OR "number"::text=${q} OR ${q}='') AND (${filter}='all' OR (${filter}='overdue' AND "status"!='delivered' AND "dueAt"<now()) OR (${filter}='ready' AND "status"='ready') OR (${filter}='unpaid' AND "paid"<"total") OR (${filter}='delivered' AND "status"='delivered')) ORDER BY CASE WHEN ${filter}='overdue' THEN "dueAt" END ASC, "createdAt" DESC, "id" DESC LIMIT 100`,
    db.$queryRaw<Array<{active:number;ready:number;outstanding:number;collected:number;expenses:number}>>`SELECT (SELECT COUNT(*)::int FROM "LaundryTicket" WHERE "businessId"=${business.id} AND "status"!='delivered') AS active,(SELECT COUNT(*)::int FROM "LaundryTicket" WHERE "businessId"=${business.id} AND "status"='ready') AS ready,(SELECT COALESCE(SUM("total"-"paid"),0)::float8 FROM "LaundryTicket" WHERE "businessId"=${business.id}) AS outstanding,(SELECT COALESCE(SUM("amount"),0)::float8 FROM "LaundryPayment" WHERE "businessId"=${business.id} AND method<>'prepaid') AS collected,(SELECT COALESCE(SUM("amount"),0)::float8 FROM "LaundryExpense" WHERE "businessId"=${business.id}) AS expenses`,
    owner?db.$queryRaw<Array<{id:string;description:string;amount:number;createdAt:Date}>>`SELECT * FROM "LaundryExpense" WHERE "businessId"=${business.id} ORDER BY "createdAt" DESC LIMIT 50`:Promise.resolve([]),
  ]);
  return <LaundryWorkspace key={business.id} activity={activity} basePath={basePath} business={{id:business.id,name:business.name,phone:business.phone??"",address:business.address??"",logoUrl:business.logoUrl}} owner={owner} services={services} tickets={tickets.map(x=>({...x,dueAt:x.dueAt.toISOString(),createdAt:x.createdAt.toISOString()}))} totals={owner?totals[0]:{active:totals[0].active,ready:totals[0].ready,outstanding:0,collected:0,expenses:0}} expenses={expenses.map(x=>({...x,createdAt:x.createdAt.toISOString()}))} query={q} filter={filter}/>;
}
