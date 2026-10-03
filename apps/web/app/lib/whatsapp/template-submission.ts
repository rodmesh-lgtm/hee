import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeMetaTemplateCategory, normalizeMetaTemplateStatus } from "./template-domain";

type Payload = { name: string; language: string; category: string; components: Array<Record<string, unknown>> };
export function recentSubmissionWhere(now: Date): Prisma.WhatsAppTemplateWhereInput {
  return { status: "pending", lastSyncedAt: { gte: new Date(now.getTime() - 86400000) }, rawPayload: { path: ["submissionReceipt"], equals: true } };
}
export type TemplateReceipt = { id: string; status: string; category: string };
export class TemplateSubmissionError extends Error {
  constructor(public readonly outcome: "rejected" | "uncertain" | "accepted-unsaved", public readonly reference = "") {
    super("META_TEMPLATE_" + outcome.toUpperCase().replace("-", "_"));
  }
}

// POST is never retried: a timeout can occur after Meta has created the template.
export async function submitTemplateRequest(input: {
  url: string; token: string; payload: Payload; existingProviderId?: string;
  persist: (receipt: TemplateReceipt) => Promise<void>; fetcher?: typeof fetch;
}) {
  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(input.url, {
      method: "POST", redirect: "error", cache: "no-store",
      headers: { authorization: `Bearer ${input.token}`, "content-type": "application/json" },
      body: JSON.stringify(input.existingProviderId ? { components: input.payload.components, category: input.payload.category } : input.payload),
      signal: AbortSignal.timeout(20000),
    });
  } catch { throw new TemplateSubmissionError("uncertain"); }
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    // Keep diagnostics numeric; never echo provider messages, tokens or payloads.
    const code = Number.isSafeInteger(value?.error?.code) ? String(value.error.code) : String(response.status);
    const subcode = Number.isSafeInteger(value?.error?.error_subcode) ? `/${value.error.error_subcode}` : "";
    throw new TemplateSubmissionError(response.status >= 500 ? "uncertain" : "rejected", code + subcode);
  }
  const id = input.existingProviderId ?? value?.id;
  if (typeof id !== "string" || !/^\d{1,128}$/.test(id) || (input.existingProviderId && value?.success !== true)) throw new TemplateSubmissionError("uncertain");
  const receipt: TemplateReceipt = {
    id,
    // An edit success confirms submission, not approval of the modified content.
    status: input.existingProviderId ? "PENDING" : typeof value?.status === "string" ? value.status : "UNKNOWN",
    category: typeof value?.category === "string" ? value.category : input.payload.category,
  };
  try { await input.persist(receipt); } catch { throw new TemplateSubmissionError("accepted-unsaved"); }
  return receipt;
}

export async function persistSubmittedTemplate(input: {
  database: Pick<PrismaClient, "$transaction">; businessId: string; connectionId: string;
  payload: Payload; receipt: TemplateReceipt; now?: Date;
}) {
  return input.database.$transaction(async tx => {
    const existing = await tx.whatsAppTemplate.findUnique({
      where: { provider_providerTemplateId: { provider: "meta", providerTemplateId: input.receipt.id } },
      select: { businessId: true, connectionId: true },
    });
    if (existing && (existing.businessId !== input.businessId || existing.connectionId !== input.connectionId)) throw new Error("META_WHATSAPP_TEMPLATE_TENANT_COLLISION");
    const data = {
      name: input.payload.name, language: input.payload.language,
      category: normalizeMetaTemplateCategory(input.receipt.category),
      status: normalizeMetaTemplateStatus(input.receipt.status), providerStatus: input.receipt.status,
      components: input.payload.components as Prisma.InputJsonValue,
      rawPayload: { id: input.receipt.id, status: input.receipt.status, category: input.receipt.category, submissionReceipt: true },
      lastSyncedAt: input.now ?? new Date(), rejectedReason: null,
    };
    if (existing) await tx.whatsAppTemplate.updateMany({
      where: { businessId: input.businessId, connectionId: input.connectionId, provider: "meta", providerTemplateId: input.receipt.id }, data,
    });
    else await tx.whatsAppTemplate.create({ data: { id: randomUUID(), businessId: input.businessId, connectionId: input.connectionId, provider: "meta", providerTemplateId: input.receipt.id, ...data } });
  });
}

export function submissionErrorMessage(error: TemplateSubmissionError) {
  if (error.outcome === "accepted-unsaved") return "قبلت Meta القالب لكن تعذر حفظه في المكتبة. استخدم تحديث من Meta لاستعادته، ولا تعِد تقديمه.";
  if (error.outcome === "uncertain") return "انقطع تأكيد النتيجة. قد تكون Meta استلمت القالب؛ استخدم تحديث من Meta للتحقق قبل تقديمه مرة أخرى.";
  const code = error.reference.split("/")[0];
  if (code === "190") return "رفضت Meta الطلب لانتهاء صلاحية اتصال الحساب. أعد ربط رقم المنشأة ثم حاول.";
  if (["10", "200", "403"].includes(code)) return "رفضت Meta الطلب بسبب صلاحيات إدارة القوالب. أعد ربط الحساب مع منح الصلاحيات المطلوبة.";
  if (["4", "17", "613", "429"].includes(code)) return "رفضت Meta الطلب مؤقتًا بسبب حد الطلبات. انتظر قبل المحاولة التالية.";
  return "رفضت Meta تقديم القالب. راجع الاسم وتأكد أنه غير مستخدم، ثم راجع الفئة والنص وأمثلة المتغيرات.";
}
