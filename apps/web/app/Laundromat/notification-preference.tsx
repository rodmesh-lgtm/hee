"use client";

import { useState } from "react";
import { useI18n } from "../../components/i18n/locale-provider";
import { normalizeAccountPhone } from "../lib/account-phone";

export function CashierNotificationPreference({ phone }: { phone: string }) {
  const { t: tr } = useI18n();
  const [disabledPhones, setDisabledPhones] = useState<string[]>([]);
  let normalized: string | null = null;
  try { normalized = normalizeAccountPhone(phone); } catch { /* Incomplete number. */ }
  const enabled = Boolean(normalized && !disabledPhones.includes(normalized));
  return <div className="ld-notification-preference">
    <label className="ld-check-label">
      <input name="notificationConsent" type="checkbox" checked={enabled} disabled={!normalized}
        onChange={event => { const checked = event.target.checked; if (normalized) setDisabledPhones(previous => checked ? previous.filter(value => value !== normalized) : [...previous, normalized]); }}/>
      {tr("إشعارات واتساب لهذا الطلب")}
    </label>
    <small>{tr(normalized ? "تُفعّل تلقائيًا للرقم الصحيح؛ يمكنك إيقافها لهذا الطلب. يُحترم إلغاء الاشتراك السابق." : "تُفعّل إشعارات الجاهزية والتذكير والتقييم عند إدخال رقم صحيح.")}</small>
  </div>;
}
