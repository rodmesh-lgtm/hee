import Link from "next/link";
import { Prisma } from "@prisma/client";
import { BadgeCheck, BriefcaseBusiness } from "lucide-react";
import { approvePlanUpgradeAdminAction, approveVerificationAdminAction } from "../../actions/admin";
import { requireAdmin } from "../../lib/admin";
import { paidPlanActivationAllowed } from "../../lib/billing";
import { db } from "../../lib/db";

type RequestRow = {
  id: string;
  eventType: string;
  metadataText: string | null;
  createdAt: Date;
  businessId: string;
  businessName: string;
  businessSlug: string;
  isVerified: boolean;
  planCode: string | null;
  planName: string | null;
};

function parseMeta(value: string | null) {
  if (!value) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

function requestTypeWhere(type: string) {
  if (type === "verification") return Prisma.sql`e."eventType" = 'verification_requested'`;
  if (type === "upgrade") return Prisma.sql`e."eventType" = 'plan_upgrade_requested'`;
  return Prisma.sql`e."eventType" IN ('verification_requested', 'plan_upgrade_requested')`;
}

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ type?: string; page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const type = params.type === "verification" || params.type === "upgrade" ? params.type : "all";
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  const typeWhere = requestTypeWhere(type);
  const manualPaidActivation = paidPlanActivationAllowed();

  // metadata historically existed as TEXT and is migrated to JSONB. Casting either
  // representation to text and extracting the status with a regex keeps this queue
  // usable during the release transition as well as after the JSONB migration.
  const statusIsPending = Prisma.sql`
    COALESCE(
      substring(e."metadata"::text from '"status"[[:space:]]*:[[:space:]]*"([^"]+)"'),
      'pending'
    ) = 'pending'
  `;

  const [rows, countRows, plans] = await Promise.all([
    db.$queryRaw<RequestRow[]>(Prisma.sql`
      SELECT
        e."id",
        e."eventType",
        e."metadata"::text AS "metadataText",
        e."createdAt",
        b."id" AS "businessId",
        b."name" AS "businessName",
        b."slug" AS "businessSlug",
        b."isVerified",
        p."code" AS "planCode",
        p."name" AS "planName"
      FROM "AnalyticsEvent" e
      JOIN "Business" b ON b."id" = e."businessId"
      LEFT JOIN "BusinessPlan" p ON p."id" = b."planId"
      WHERE b."deletedAt" IS NULL
        AND ${typeWhere}
        AND ${statusIsPending}
      ORDER BY e."createdAt" DESC, e."id" DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    db.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "AnalyticsEvent" e
      JOIN "Business" b ON b."id" = e."businessId"
      WHERE b."deletedAt" IS NULL
        AND ${typeWhere}
        AND ${statusIsPending}
    `),
    db.businessPlan.findMany({ where: { isActive: true }, select: { code: true } }),
  ]);

  const total = Number(countRows[0]?.count ?? BigInt(0));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activePlans = new Set(plans.map((plan) => plan.code));

  const pageHref = (nextPage: number) => `/admin/requests?page=${nextPage}${type !== "all" ? `&type=${type}` : ""}`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-[#1f2552] sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5">
          <h1 className="text-xl font-black">طلبات الإدارة</h1>
          <p className="mt-1 text-sm text-slate-500">قائمة كاملة ومقسمة صفحات لطلبات التوثيق والترقية المعلقة.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <Link href="/admin/requests" className={`rounded-xl px-3 py-2 ${type === "all" ? "bg-[#6f3bd2] text-white" : "bg-[#f4f1fb] text-[#5d49cc]"}`}>الكل</Link>
            <Link href="/admin/requests?type=verification" className={`rounded-xl px-3 py-2 ${type === "verification" ? "bg-[#6f3bd2] text-white" : "bg-[#f4f1fb] text-[#5d49cc]"}`}>التوثيق</Link>
            <Link href="/admin/requests?type=upgrade" className={`rounded-xl px-3 py-2 ${type === "upgrade" ? "bg-[#6f3bd2] text-white" : "bg-[#f4f1fb] text-[#5d49cc]"}`}>الترقية</Link>
          </div>
        </header>

        {!manualPaidActivation && (type === "all" || type === "upgrade") ? <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-900"><b>الترقيات المدفوعة محمية بالدفع:</b> لا تمنح لوحة الإدارة باقة مدفوعة يدويًا. يتم تفعيل BUSINESS وPRO فقط بعد إثبات عملية دفع موثقة من مزود الدفع؛ الطلبات القديمة هنا للمراجعة والتتبع فقط.</div> : null}

        <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5">
          <div className="space-y-3">
            {rows.map((row) => {
              const metadata = parseMeta(row.metadataText);
              const requestedPlan = String(metadata.requestedPlan ?? "BUSINESS").toUpperCase();
              const isVerification = row.eventType === "verification_requested";
              const planReady = activePlans.has(requestedPlan);
              return (
                <article key={row.id} className="rounded-2xl border border-[#ece9f3] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {isVerification ? <BadgeCheck className="h-4 w-4 text-blue-600" /> : <BriefcaseBusiness className="h-4 w-4 text-[#6f3bd2]" />}
                        <b className="text-sm">{row.businessName}</b>
                      </div>
                      <span className="mt-1 block text-xs text-slate-500">ir.sa/{row.businessSlug} · {row.planName ?? row.planCode ?? "Free"}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(row.createdAt)}</span>
                      {!isVerification ? <span className="mt-1 block text-xs font-bold text-[#5d49cc]">الخطة المطلوبة: {requestedPlan}</span> : null}
                      {!isVerification && !planReady ? <span className="mt-1 block text-[11px] font-bold text-rose-600">الباقة {requestedPlan} غير مهيأة.</span> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/businesses/${row.businessId}`} className="rounded-xl border border-[#e5e1ec] px-3 py-2 text-xs font-black">مراجعة المنشأة</Link>
                      {isVerification ? (
                        row.isVerified ? <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">موثق بالفعل</span> :
                        <form action={approveVerificationAdminAction}><input type="hidden" name="eventId" value={row.id} /><button className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-black text-white">اعتماد التوثيق</button></form>
                      ) : manualPaidActivation ? (
                        <form action={approvePlanUpgradeAdminAction}><input type="hidden" name="eventId" value={row.id} /><button disabled={!planReady} className="h-9 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white disabled:bg-slate-300">اعتماد الترقية</button></form>
                      ) : (
                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">يتطلب دفعًا موثقًا</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            {!rows.length ? <div className="rounded-2xl bg-[#faf9fd] px-4 py-8 text-center text-sm text-slate-500">لا توجد طلبات معلقة ضمن هذا التصنيف.</div> : null}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>{total} طلب معلق · صفحة {Math.min(page, totalPages)} من {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-lg border px-3 py-1.5">السابق</Link> : null}
              {page < totalPages ? <Link href={pageHref(page + 1)} className="rounded-lg border px-3 py-1.5">التالي</Link> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
