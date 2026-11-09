"use client";
import {CashierUnitField} from "./item-units";
import { useState } from "react";
import { useI18n } from "../../components/i18n/locale-provider";
import { laundryMoney, type CashierUnit, CASHIER_UNITS, type LaundryService } from "../lib/laundry-domain";

type Edit = {unit:CashierUnit;id:string;name:string;category:string;price:string;urgentPrice:string;previous:{unit:CashierUnit;name:string;category:string;price:number;urgentPrice:number|null}};
export function CashierServiceEditor({services,busy,urgentEnabled,onSave,onArchive}:{services:LaundryService[];busy:boolean;urgentEnabled:boolean;onSave:(data:Edit)=>Promise<boolean>;onArchive:(id:string)=>Promise<boolean>}) {
 const {t,intlLocale}=useI18n();
 const [query,setQuery]=useState(""),[editing,setEditing]=useState<string|null>(null);
 const visible=services.filter(s=>`${s.name} ${s.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <section aria-label={t("إدارة الأصناف والأسعار")}>
  <p className="ld-fine">{t("تسري التعديلات على الفواتير الجديدة فقط. تحتفظ الفواتير السابقة بأسماء أصنافها وأسعارها، وتبقى ارتباطات الباقات محفوظة.")}</p>
  <label>{t("البحث عن صنف")}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  {visible.map(s=><article className="ld-service-edit" key={`${s.id}:${s.name}:${s.category}:${s.price}:${s.urgentPrice??""}:${s.unit??"piece"}`}>
   <div className="ld-service-row"><div><strong>{s.name}</strong><small>{s.category}</small></div><span>{laundryMoney(s.price,intlLocale)} {t("ر.س")} / {t(CASHIER_UNITS[s.unit??"piece"])}</span><div className="ld-service-buttons"><button type="button" className="ld-outline" disabled={busy} onClick={()=>setEditing(s.id)} aria-label={`${t("تعديل")} — ${s.name}`}>{t("تعديل")}</button><button type="button" disabled={busy} className="ld-outline" onClick={()=>{if(window.confirm(t("إيقاف الخدمة للطلبات الجديدة؟ الطلبات السابقة تبقى محفوظة.")))void onArchive(s.id);}}>{t("إيقاف")}</button></div></div>
   {editing===s.id?<form className="ld-inline-form" aria-label={`${t("تعديل")} — ${s.name}`} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(await onSave({unit:String(f.get("unit")) as CashierUnit,id:s.id,name:String(f.get("name")),category:String(f.get("category")),price:String(f.get("price")),urgentPrice:String(f.get("urgentPrice")??""),previous:{unit:s.unit??"piece",name:s.name,category:s.category,price:s.price,urgentPrice:s.urgentPrice??null}}))setEditing(null);}}>
    <fieldset disabled={busy} className="ld-service-fields"><CashierUnitField value={s.unit}/><label>{t("اسم الصنف")}<input name="name" required minLength={2} maxLength={100} defaultValue={s.name}/></label><label>{t("التصنيف")}<input name="category" required minLength={2} maxLength={50} defaultValue={s.category}/></label><label>{t("السعر بالريال")}<input name="price" type="number" inputMode="decimal" required min="0.01" max="100000" step="0.01" defaultValue={(s.price/100).toFixed(2)}/></label>{urgentEnabled||s.urgentPrice!=null?<label>{t("سعر المستعجل بالريال")}<input name="urgentPrice" type="number" inputMode="decimal" min="0.01" max="100000" step="0.01" defaultValue={s.urgentPrice==null?"":(s.urgentPrice/100).toFixed(2)}/></label>:null}<button className="ld-primary">{t("حفظ التعديلات")}</button><button type="button" className="ld-outline" onClick={()=>setEditing(null)}>{t("إلغاء")}</button></fieldset>
   </form>:null}
  </article>)}
  {!visible.length?<p className="ld-fine" role="status">{t("لا توجد أصناف مطابقة")}</p>:null}
 </section>;
}
