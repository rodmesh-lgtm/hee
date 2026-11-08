"use server";
import { z } from "zod";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { laundryCustomerPhone } from "../lib/laundry-customer";
import { laundryReportRange } from "../lib/laundry-report";
import type { CommissionEntry, CommissionReport, CommissionSummary } from "../lib/cashier-commission";

export async function findCommissionEmployee(value: unknown) {
  const input = z.object({ businessId: z.string().uuid(), phone: z.string().min(8).max(40) }).safeParse(value);
  if (!input.success) return { ok: false as const, error: "أدخل جوال الموظف كاملًا" };
  const user = await getCurrentUser();
  const business = user && await getActiveBusinessForUser(user.id, "laundry");
  if (!business || business.id !== input.data.businessId) return { ok: false as const, error: "لا تملك صلاحية كاشير المنشأة النشطة" };
  try {
    const phone = laundryCustomerPhone(input.data.phone);
    const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT name FROM "CashierCommission" WHERE "businessId"=${business.id} AND phone=${phone} ORDER BY "createdAt" DESC,id DESC LIMIT 1`;
    return { ok: true as const, name: rows[0]?.name ?? null };
  } catch { return { ok: false as const, error: "تعذر استدعاء الموظف. تحقق من الجوال وأعد المحاولة" }; }
}

export async function getCommissionReport(value: unknown): Promise<{ ok: true; report: CommissionReport } | { ok: false; error: string }> {
  const input = z.object({ businessId: z.string().uuid(), from: z.string().max(10), to: z.string().max(10), phone: z.string().max(40).default(""), page: z.number().int().min(0).max(100000).default(0) }).safeParse(value);
  if (!input.success) return { ok: false, error: "راجع فترة التقرير وجوال الموظف" };
  const user = await getCurrentUser();
  const business = user && await getActiveBusinessForUser(user.id, "laundryAccounting");
  if (!business || business.id !== input.data.businessId) return { ok: false, error: "التقرير يتطلب صلاحية محاسبة المنشأة النشطة" };
  try {
    const { start, end } = laundryReportRange(input.data.from, input.data.to);
    const phone = input.data.phone.trim() ? laundryCustomerPhone(input.data.phone) : "";
    const report = await db.$transaction(async tx => {
      const employees = await tx.$queryRaw<CommissionSummary[]>`SELECT phone,(array_agg(name ORDER BY "createdAt" DESC,id DESC))[1] AS name,COUNT(*)::int AS invoices,SUM(amount)::float8 AS amount FROM "CashierCommissionEvent" WHERE "businessId"=${business.id} AND "createdAt">=${start} AND "createdAt"<${end} AND (${phone}='' OR phone=${phone}) GROUP BY phone ORDER BY amount DESC,phone`;
      const entries = await tx.$queryRaw<Array<Omit<CommissionEntry,"createdAt"> & {createdAt: Date}>>`SELECT c.id,t.number,c.name,c.phone,c.kind,c.value,c.base,c.amount,c."createdAt" FROM "CashierCommissionEvent" c JOIN "LaundryTicket" t ON t."businessId"=c."businessId" AND t.id=c."ticketId" WHERE c."businessId"=${business.id} AND c."createdAt">=${start} AND c."createdAt"<${end} AND (${phone}='' OR c.phone=${phone}) ORDER BY c."createdAt" DESC,c.id DESC LIMIT 100 OFFSET ${input.data.page * 100}`;
      return { employees, entries: entries.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })), count: employees.reduce((sum,row)=>sum+row.invoices,0), amount: employees.reduce((sum,row)=>sum+row.amount,0), page: input.data.page };
    }, { isolationLevel: "RepeatableRead", timeout: 15000 });
    return { ok: true, report };
  } catch { return { ok: false, error: "تعذر تحميل العمولات. تحقق من التواريخ والجوال ثم أعد المحاولة" }; }
}
