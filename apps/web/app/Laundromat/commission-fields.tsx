"use client";
import { useRef, useState } from "react";
import { useI18n } from "../../components/i18n/locale-provider";
import { findCommissionEmployee } from "./commission-actions";
import type { CommissionKind } from "../lib/cashier-commission";

export function CommissionFields({ businessId }: { businessId: string }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CommissionKind>("fixed");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  return <fieldset className="ld-schedule">
    <legend>{t("عمولة الموظف")}</legend>
    <label className="ld-check-label"><input name="commissionEnabled" type="checkbox" checked={enabled} onChange={event => { setEnabled(event.target.checked); revision.current++; setMessage(""); }}/>{t("إضافة عمولة لهذه الفاتورة")}</label>
    {enabled ? <>
      <label>{t("جوال موظف العمولة")}<input name="commissionPhone" type="tel" dir="ltr" required maxLength={40} placeholder="05xxxxxxxx" value={phone} onChange={event => { revision.current++; setPhone(event.target.value); setName(""); setMessage(""); }}/></label>
      <button className="ld-outline" type="button" disabled={busy || phone.trim().length < 8} onClick={async () => {
        const version = ++revision.current;
        setBusy(true); setMessage("");
        try { const result = await findCommissionEmployee({ businessId, phone }); if (version !== revision.current) return;
          if (result.ok) { setName(result.name ?? ""); setMessage(result.name ? "تم استدعاء اسم الموظف. أدخل العمولة المتفق عليها لهذه الفاتورة." : "موظف جديد: أدخل اسمه والعمولة؛ سيظهر في سجل منشأتك عند حفظ الفاتورة."); }
          else setMessage(result.error);
        } catch { if (version === revision.current) setMessage("تعذر الاتصال. أعد المحاولة."); }
        finally { setBusy(false); }
      }}>{t(busy ? "جارٍ البحث…" : "استدعاء الموظف بالجوال")}</button>
      {message ? <p className="ld-fine" role="status">{t(message)}</p> : null}
      <label>{t("اسم موظف العمولة")}<input name="commissionName" required minLength={2} maxLength={100} value={name} onChange={event => { revision.current++; setName(event.target.value); }}/></label>
      <div className="ld-form-row">
        <label>{t("نوع العمولة")}<select name="commissionKind" value={kind} onChange={event => setKind(event.target.value as CommissionKind)}><option value="fixed">{t("مبلغ ثابت بالريال")}</option><option value="percent">{t("نسبة من إجمالي الفاتورة")}</option></select></label>
        <label>{t(kind === "fixed" ? "قيمة العمولة بالريال" : "نسبة العمولة ٪")}<input key={kind} name="commissionValue" type="number" inputMode="decimal" required min="0.01" max={kind === "percent" ? "100" : "100000"} step="0.01"/></label>
      </div>
      <p className="ld-fine">{t("تُسجل العمولة عند إصدار الفاتورة. النسبة من إجماليها النهائي، ولا تتجاوز العمولة قيمتها. لا تُضاف إلى مبلغ العميل ولا تظهر في فاتورته. تسجيلها لا يعني صرفها للموظف.")}</p>
    </> : null}
  </fieldset>;
}
