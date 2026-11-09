"use client";
import {useState} from 'react';
import {useI18n} from '../../components/i18n/locale-provider';
import {CASHIER_UNITS,quantityTicks,type CashierUnit} from '../lib/laundry-domain';
export function CashierUnitField({value='piece'}:{value?:CashierUnit}){
 const {t}=useI18n();return <label>{t('وحدة الصنف')}<select name="unit" aria-label={t('وحدة الصنف')} defaultValue={value}>{Object.entries(CASHIER_UNITS).map(([key,label])=><option key={key} value={key}>{t(label)}</option>)}</select></label>;
}
export function MeasuredQuantity({name,unit,quantity,onChange}:{name:string;unit:CashierUnit;quantity:number;onChange:(value:number|null)=>void}){
 const {t}=useI18n(),[input,setInput]=useState({quantity,draft:String(quantity)});
 if(input.quantity!==quantity)setInput({quantity,draft:String(quantity)});
 const draft=input.quantity===quantity?input.draft:String(quantity);
 let invalid=false;try{quantityTicks(Number(draft),unit);}catch{invalid=true;}
 return <label className="ld-measured-quantity">{t('الكمية')} · {t(CASHIER_UNITS[unit])}<input aria-label={`${t('قياس')} — ${name}`} type="number" inputMode="decimal" min="0.01" max="10000" step="0.01" value={draft} aria-invalid={invalid} onChange={e=>{const value=e.target.value;try{quantityTicks(Number(value),unit);setInput({quantity:Number(value),draft:value});onChange(Number(value));}catch{setInput({quantity,draft:value});onChange(null);}}}/>{invalid?<small role="alert">{t('أدخل قياسًا موجبًا بمنزلتين عشريتين كحد أقصى')}</small>:null}</label>;
}
