"use client";

import type { ZatcaBuyer } from "../lib/cashier-zatca-document";
import { useState } from "react";

export function ZatcaBuyerFields({ required, initial }: { required: boolean; initial?: ZatcaBuyer & { supplyDate?: string } }) {
  const [selected, setSelected] = useState(false);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Riyadh" }).format(new Date());
  return <fieldset className="ld-schedule">
    <legend>فاتورة ضريبية لشركة</legend>
    {required ? <input name="zatcaStandard" type="hidden" value="on"/> :
      <label><input name="zatcaStandard" type="checkbox" checked={selected} onChange={event => setSelected(event.target.checked)}/>
        {" "}إصدار فاتورة لشركة مسجّلة في الضريبة</label>}
    {required || selected ? <>
      {!initial ? <p className="ld-fine">تتاح الطباعة والتنزيل بعد اعتماد زاتكا.</p> : null}
      <div className="ld-form-row">
        <label>الاسم القانوني للمشتري<input name="zatcaBuyerName" defaultValue={initial?.name} maxLength={100} required/></label>
        <label>الرقم الضريبي للمشتري<input name="zatcaBuyerVat" defaultValue={initial?.vatNumber} inputMode="numeric" dir="ltr" pattern="3[0-9]{13}3" required/></label>
        <label>تاريخ التوريد<input name="zatcaSupplyDate" type="date" max={today} defaultValue={initial ? initial.supplyDate ?? "" : today} required/></label>
        <label>شارع المشتري<input name="zatcaBuyerStreet" defaultValue={initial?.street} maxLength={100} required/></label>
        <label>حي المشتري<input name="zatcaBuyerDistrict" defaultValue={initial?.district} maxLength={100} required/></label>
        <label>مدينة المشتري<input name="zatcaBuyerCity" defaultValue={initial?.city} maxLength={100} required/></label>
        <label>منطقة المشتري<input name="zatcaBuyerRegion" defaultValue={initial?.region} maxLength={100} required/></label>
        <label>رقم المبنى<input name="zatcaBuyerBuilding" defaultValue={initial?.building} inputMode="numeric" dir="ltr" pattern="[0-9]{4}" required/></label>
        <label>الرقم الإضافي<input name="zatcaBuyerAdditional" defaultValue={initial?.additionalNumber} inputMode="numeric" dir="ltr" pattern="[0-9]{4}" required/></label>
        <label>الرمز البريدي<input name="zatcaBuyerPostal" defaultValue={initial?.postalCode} inputMode="numeric" dir="ltr" pattern="[0-9]{5}" required/></label>
      </div>
    </> : null}
  </fieldset>;
}
