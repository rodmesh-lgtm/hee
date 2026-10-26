"use client";

import { useState } from "react";

export function SallaSubscriptionCheck({ integrationId, english }: { integrationId: string; english: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const t = (ar: string, en: string) => english ? en : ar;
  async function check() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/commerce/salla/subscription?store=${encodeURIComponent(integrationId)}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
      const result = await response.json() as { error?: string; subscriptions?: unknown[] };
      if (response.status === 429) setMessage(t("تم إجراء عدة محاولات. انتظر دقيقة ثم أعد التحقق.", "Too many checks. Wait a minute and try again."));
      else if (response.status === 403) setMessage(t("لا تملك صلاحية فحص الاشتراك. حدّث الصفحة أو راجع مالك الحساب.", "You cannot check this subscription. Refresh the page or contact the account owner."));
      else if (result.error === "SALLA_SUBSCRIPTION_HTTP_404") setMessage(t("لم تُرجع سلة سجل اشتراك لهذا التطبيق. ربط المتجر قائم، لكن لا يمكن تأكيد اشتراك سلة حاليًا. تواصل مع دعم INFRO قبل أي دفع إضافي.", "Salla did not return a subscription record for this app. Your store remains connected, but its Salla subscription cannot be verified yet. Contact INFRO support before making another payment."));
      else if (!response.ok) setMessage(t("تعذّر التحقق من سلة الآن. لم يتغير اشتراكك ولم يُخصم أي مبلغ. أعد المحاولة لاحقًا أو تواصل مع الدعم.", "Salla verification is unavailable. Your subscription has not changed and no payment was taken. Try later or contact support."));
      else setMessage(t("تم استلام سجل الاشتراك من سلة. التفعيل التلقائي لباقات سلة لم يُتح بعد؛ راجع الدعم لتأكيد صلاحيات حسابك.", "Subscription records were received from Salla. Automatic Salla plan activation is not available yet; contact support to confirm your account access."));
    } catch {
      setMessage(t("تعذّر الاتصال بخدمة التحقق. أعد المحاولة لاحقًا؛ لم يتغير اشتراكك.", "Could not reach the verification service. Try later; your subscription has not changed."));
    } finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3">
    <button type="button" onClick={check} disabled={busy} className="min-h-11 rounded-xl border border-teal-700 px-4 py-2 font-bold text-teal-800 disabled:opacity-50">{busy ? t("جارٍ التحقق…", "Checking…") : t("فحص اشتراك سلة", "Check Salla subscription")}</button>
    <p role="status" aria-live="polite" className="text-sm leading-7 text-slate-600">{message}</p>
  </div>;
}
