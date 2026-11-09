"use client";
import {useI18n} from '../../components/i18n/locale-provider';
import {CASHIER_UNITS,quantityTicks,type CashierUnit} from '../lib/laundry-domain';
export function CashierUnitField({value='piece'}:{value?:CashierUnit}){
 const {t}=useI18n();return <label>{t('وحدة الصنف')}<select name="unit" aria-label={t('وحدة الصنف')} defaultValue={value}>{Object.entries(CASHIER_UNITS).map(([key,label])=><option key={key} value={key}>{t(label)}</option>)}</select></label>;
}
export function MeasuredQuantity({name,unit,value,onChange}:{name:string;unit:CashierUnit;value:string;onChange:(value:string)=>void}){
 const {t}=useI18n();
 let invalid=false;try{quantityTicks(Number(value),unit);}catch{invalid=true;}
 return <label className="ld-measured-quantity">{t('الكمية')} · {t(CASHIER_UNITS[unit])}<input aria-label={`${t('قياس')} — ${name}`} type="number" inputMode="decimal" min="0.01" max="10000" step="0.01" value={value} aria-invalid={invalid} onChange={e=>onChange(e.target.value)}/>{invalid?<small role="alert">{t('أدخل قياسًا موجبًا بمنزلتين عشريتين كحد أقصى')}</small>:null}</label>;
}
