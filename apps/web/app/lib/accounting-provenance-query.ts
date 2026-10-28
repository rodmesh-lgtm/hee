import { Prisma } from "@prisma/client";

/** Admin-only metadata. Findings request investigation, never deletion or reassignment.
 * Current membership alone cannot establish historic authorization.
 */
export function accountingProvenanceQuery(businessId: string) {
  return Prisma.sql`SELECT t.id, t.number, t."businessId", t."createdBy", t."createdAt",
    EXISTS (SELECT 1 FROM "LaundryAudit" a WHERE a."businessId"=t."businessId"
      AND a."targetId"=t.id AND a."actorId"=t."createdBy" AND a.action='order') AS "creationAuditPresent",
    EXISTS (SELECT 1 FROM "LaundryAudit" a WHERE a."targetId"=t.id
      AND a."businessId"<>t."businessId") AS "foreignAuditPresent",
    (t."createdBy"=b."ownerId" OR EXISTS (SELECT 1 FROM "BusinessMember" m
      WHERE m."businessId"=t."businessId" AND m."userId"=t."createdBy"
      AND m.status='active')) AS "creatorCurrentlyAuthorized",
    (t."customerId" IS NULL OR EXISTS (SELECT 1 FROM "LaundryCustomer" c
      WHERE c.id=t."customerId" AND c."businessId"=t."businessId")) AS "customerScoped",
    EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(t.items)='array'
      THEN t.items ELSE '[]'::jsonb END) line
      JOIN "LaundryService" s ON s.id=line->>'serviceId'
      WHERE s."businessId"<>t."businessId") AS "foreignServicePresent",
    EXISTS (SELECT 1 FROM "LaundryPayment" p WHERE p."ticketId"=t.id
      AND p."businessId"<>t."businessId") AS "foreignPaymentPresent"
    FROM "LaundryTicket" t JOIN "Business" b ON b.id=t."businessId"
    WHERE t."businessId"=${businessId}
    ORDER BY t."createdAt" DESC,t.id DESC LIMIT 500`;
}
export type AccountingProvenance = {
  id: string; number: number; businessId: string; createdBy: string; createdAt: Date;
  creationAuditPresent: boolean; foreignAuditPresent: boolean;
  creatorCurrentlyAuthorized: boolean; customerScoped: boolean;
  foreignServicePresent: boolean; foreignPaymentPresent: boolean;
};
export function accountingProvenanceFindings(row: AccountingProvenance): string[] {
  const findings: string[] = [];
  if (!row.creationAuditPresent) findings.push("سجل إنشاء مطابق غير موجود");
  if (row.foreignAuditPresent) findings.push("حركة تدقيق تحمل منشأة مختلفة");
  if (!row.creatorCurrentlyAuthorized) findings.push("يلزم التحقق من صلاحية المنفذ وقت الإنشاء");
  if (!row.customerScoped) findings.push("ملف العميل غير مطابق للمنشأة");
  if (row.foreignServicePresent) findings.push("مرجع خدمة تابع لمنشأة مختلفة");
  if (row.foreignPaymentPresent) findings.push("تحصيل يحمل منشأة مختلفة");
  return findings;
}
