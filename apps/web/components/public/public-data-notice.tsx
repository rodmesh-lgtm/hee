"use client";

import { useI18n } from "../i18n/locale-provider";

/** Explain the actual destination before submitting; this is not marketing opt-in. */
export function PublicDataNotice({ businessName, storeRequest = true, whatsapp = false, dark = false }: {
  businessName: string; storeRequest?: boolean; whatsapp?: boolean; dark?: boolean;
}) {
  const { t } = useI18n();
  return <div data-public-data-notice aria-label={t("استخدام بياناتك")} className={`mb-3 rounded-xl border p-3 text-xs leading-6 ${dark ? "border-white/15 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
    {storeRequest ? <p>{t("تُسجّل بيانات هذا النموذج عبر INFRO وتُتاح للمنشأة لمعالجة طلبك أو حجزك:")} <b dir="auto">{businessName}</b>.</p> : null}
    {whatsapp ? <p>{t("عند المتابعة، تُجهّز بيانات النموذج في رسالة واتساب إلى المنشأة. راجع الرسالة قبل إرسالها.")}</p> : null}
    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">{t("سياسة الخصوصية واستخدام البيانات")}</a>
  </div>;
}
