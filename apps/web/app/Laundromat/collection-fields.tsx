"use client";
import { useState } from "react";
export function CollectionFields({ maximum, additional = false }: { maximum: number; additional?: boolean }) {
  const [method, setMethod] = useState("cash");
  return <div className="ld-form-row">
    <label>{additional ? "دفعة إضافية" : "الدفعة المستلمة"}<input name={additional ? "amount" : "paid"} inputMode="decimal" type="number" min={additional ? "0.01" : "0"} max={maximum / 100} step="0.01" defaultValue={additional ? undefined : "0"} required/></label>
    <label>{additional ? "الطريقة" : "طريقة التحصيل"}<select aria-label={additional ? "الطريقة" : "طريقة التحصيل"} name="method" value={method} onChange={e => setMethod(e.target.value)}><option value="cash">نقدًا</option><option value="card">شبكة — تسجيل يدوي</option><option value="transfer">تحويل — تسجيل يدوي</option><option value="mixed">نقدًا + شبكة — تسجيل يدوي</option></select></label>
    {method === "mixed" ? <><label>الجزء النقدي من الدفعة<input name="cashPaid" inputMode="decimal" type="number" min="0.01" max={maximum / 100} step="0.01" required/></label><p className="ld-fine">يُسجّل باقي الدفعة كشبكة. أكّد نجاح الدفع على الجهاز قبل الحفظ؛ الربط التلقائي لم يُفعّل بعد.</p></> : null}
  </div>;
}
