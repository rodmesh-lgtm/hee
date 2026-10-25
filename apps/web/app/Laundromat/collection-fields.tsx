"use client";
import { useI18n } from "../../components/i18n/locale-provider";
import { useState } from "react";
export function CollectionFields({ maximum, additional = false,onAmountChange,amountValue }: { maximum: number; additional?: boolean;onAmountChange?:(value:string)=>void;amountValue?:string }) {
 const { t: tr } = useI18n();

  const [method, setMethod] = useState("cash");
  return <div className="ld-form-row">
    <label>{additional ? tr("دفعة إضافية") : tr("الدفعة المستلمة")}<input name={additional ? "amount" : "paid"} inputMode="decimal" type="number" min={additional ? "0.01" : "0"} max={maximum / 100} step="0.01" onChange={e=>onAmountChange?.(e.target.value)} value={amountValue} defaultValue={amountValue===undefined?(additional ? undefined : "0"):undefined} required/></label>
    <label>{additional ? tr("الطريقة") : tr("طريقة التحصيل")}<select aria-label={additional ? tr("الطريقة") : tr("طريقة التحصيل")} name="method" value={method} onChange={e => setMethod(e.target.value)}><option value="cash">{tr("نقدًا")}</option><option value="card">{tr("شبكة — تسجيل يدوي")}</option><option value="transfer">{tr("تحويل — تسجيل يدوي")}</option><option value="mixed">{tr("نقدًا + شبكة — تسجيل يدوي")}</option></select></label>
    {method === "mixed" ? <><label>{tr("الجزء النقدي من الدفعة")}<input name="cashPaid" inputMode="decimal" type="number" min="0.01" max={maximum / 100} step="0.01" required/></label><p className="ld-fine">{tr("يُسجّل باقي الدفعة كشبكة. أكّد نجاح الدفع على الجهاز قبل الحفظ؛ الربط التلقائي لم يُفعّل بعد.")}</p></> : null}
  </div>;
}
