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
    db.$queryRaw<LaundryService[]>`SELECT * FROM "LaundryService" WHERE "businessId"=${business.id} AND "active"=TRUE ORDER BY "category","name"`,
    db.$queryRaw<LaundryTicket[]>`SELECT "id","number","customerName","phone","items","total","paid","status","dueAt","notes","createdAt" FROM "LaundryTicket" WHERE "businessId"=${business.id} AND ("customerName" ILIKE ${pattern} OR "phone" ILIKE ${pattern} OR "phone" IN (${normalizedPhone},${normalizedPhone.replace(/^\+/,"")},${localPhone}) OR "number"::text=${q} OR ${q}='') AND (${filter}='all' OR (${filter}='overdue' AND "status"!='delivered' AND "dueAt"<now()) OR (${filter}='ready' AND "status"='ready') OR (${filter}='unpaid' AND "paid"<"total") OR (${filter}='delivered' AND "status"='delivered')) ORDER BY CASE WHEN ${filter}='overdue' THEN "dueAt" END ASC, "createdAt" DESC, "id" DESC LIMIT 100`,
    db.$queryRaw<Array<{active:number;ready:number;outstanding:number;collected:number;expenses:number}>>`SELECT (SELECT COUNT(*)::int FROM "LaundryTicket" WHERE "businessId"=${business.id} AND "status"!='delivered') AS active,(SELECT COUNT(*)::int FROM "LaundryTicket" WHERE "businessId"=${business.id} AND "status"='ready') AS ready,(SELECT COALESCE(SUM("total"-"paid"),0)::float8 FROM "LaundryTicket" WHERE "businessId"=${business.id}) AS outstanding,(SELECT COALESCE(SUM("amount"),0)::float8 FROM "LaundryPayment" WHERE "businessId"=${business.id} AND method<>'prepaid') AS collected,(SELECT COALESCE(SUM("amount"),0)::float8 FROM "LaundryExpense" WHERE "businessId"=${business.id}) AS expenses`,
    owner?db.$queryRaw<Array<{id:string;description:string;amount:number;createdAt:Date}>>`SELECT * FROM "LaundryExpense" WHERE "businessId"=${business.id} ORDER BY "createdAt" DESC LIMIT 50`:Promise.resolve([]),
  ]);
  return <LaundryWorkspace key={business.id} activity={activity} basePath={basePath} business={{id:business.id,name:business.name,phone:business.phone??"",address:business.address??"",logoUrl:business.logoUrl}} owner={owner} services={services} tickets={tickets.map(x=>({...x,dueAt:x.dueAt.toISOString(),createdAt:x.createdAt.toISOString()}))} totals={owner?totals[0]:{active:totals[0].active,ready:totals[0].ready,outstanding:0,collected:0,expenses:0}} expenses={expenses.map(x=>({...x,createdAt:x.createdAt.toISOString()}))} query={q} filter={filter}/>;
}
