"use server";

import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";
import { consumePublicWriteLimit } from "../../lib/rate-limit";
import { readSallaSubscription, sallaSubscriptionSummary, SallaSubscriptionReadError } from "../../lib/commerce/salla-subscription-read";
import { SALLA_SUBSCRIPTION_FAILURE_GUIDANCE } from "../../lib/commerce/salla-subscription-diagnostics";

export type SallaAdminCheckState = {
  status: "idle" | "success" | "error";
  message: string;
  checkedAt?: string;
  providerStatus?: number;
  subscriptions?: ReturnType<typeof sallaSubscriptionSummary>;
};

/** A support diagnostic, never an entitlement override or a payment operation. */
export async function checkAdminSallaSubscription(_previous: SallaAdminCheckState, form: FormData): Promise<SallaAdminCheckState> {
  const admin = await requireAdmin();
  const integrationId = String(form.get("integrationId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(integrationId)) return { status: "error", message: "معرّف الربط غير صالح." };
  const integration = await db.whatsAppCommerceIntegration.findFirst({
    where: { id: integrationId, provider: "salla", status: "active", business: { deletedAt: null } },
    select: { id: true, businessId: true },
  });
  if (!integration) return { status: "error", message: "لا يوجد ربط سلة نشط لهذا المتجر." };
  const rate = await consumePublicWriteLimit({ scope: "admin-salla-subscription-check", businessId: integration.businessId, identity: admin.id, limit: 5, windowSeconds: 60 });
  if (!rate.allowed) return { status: "error", message: "انتظر دقيقة قبل إعادة الفحص." };
  const checkedAt = new Date().toISOString();
  try {
    const result = await readSallaSubscription({ businessId: integration.businessId, integrationId: integration.id });
    return { status: "success", checkedAt, message: "وصل سجل الاشتراك من سلة. هذا الفحص للقراءة فقط؛ لم يُفعّل اشتراك أو تُغيّر صلاحيات أو يُخصم مبلغ.", subscriptions: sallaSubscriptionSummary(result.subscriptions) };
  } catch (error) {
    if (error instanceof SallaSubscriptionReadError) {
      const message = error.providerStatus === 404
        ? "أعادت سلة HTTP404 لسجل الاشتراك. لا يمكن اعتباره إثباتًا لعدم الدفع. طابق معرّف التطبيق وعميل OAuth مع بوابة الشركاء وتحقق من حالة اشتراك المتجر."
        : error.providerStatus === 401 || error.providerStatus === 403
          ? "رفضت سلة الوصول إلى سجل الاشتراك. راجع التفويض والصلاحيات ثم أعد ربط المتجر عند الحاجة."
          : "تعذر استلام سجل اشتراك صالح من سلة. لم تتغير صلاحيات الحساب.";
      return { status: "error", checkedAt, providerStatus: error.providerStatus, message: `${message} ${SALLA_SUBSCRIPTION_FAILURE_GUIDANCE[error.failureReason]}` };
    }
    return { status: "error", checkedAt, message: error instanceof Error && error.message === "SALLA_SUBSCRIPTION_CONNECTION_CHANGED"
      ? "تغيّر ربط المتجر أثناء الفحص. تجاهلنا الاستجابة القديمة؛ أعد الفحص للربط الحالي."
      : "تعذر فحص اشتراك سلة. راجع إعدادات الخدمة وحالة الربط؛ لم تتغير صلاحيات الحساب." };
  }
}
