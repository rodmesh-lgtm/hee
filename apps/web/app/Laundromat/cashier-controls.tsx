"use client";
import { useI18n } from '../../components/i18n/locale-provider';
import type { CashierDiscount } from '../lib/cashier-discount';
import type { LaundryService } from '../lib/laundry-domain';
export function CashierDiscountFields({discount,onChange}:{discount:CashierDiscount;onChange:(value:CashierDiscount)=>void}){
 const {t}=useI18n();
 return <fieldset className="ld-schedule"><legend>{t('خصم الفاتورة')}</legend><label>{t('نوع الخصم')}<select name="discountKind" value={discount.kind} onChange={e=>onChange({kind:e.target.value as CashierDiscount['kind'],value:'0'})}><option value="none">{t('بدون خصم')}</option><option value="percent">{t('نسبة مئوية')}</option><option value="fixed">{t('مبلغ ثابت')}</option></select></label>{discount.kind!=='none'?<><label>{t(discount.kind==='percent'?'نسبة الخصم ٪':'قيمة الخصم بالريال')}<input name="discountValue" type="number" inputMode="decimal" min="0" max={discount.kind==='percent'?'99.99':'100000'} step="0.01" required value={discount.value} onChange={e=>onChange({...discount,value:e.target.value})}/></label><p className="ld-fine">{t('يطبق الخصم على الخدمات غير المغطاة بباقات القطع والزيارات، قبل استخدام الرصيد المالي والتحصيل.')}</p></>:<input type="hidden" name="discountValue" value="0"/>}</fieldset>;
}
export function CashierUrgentRate({service,busy,onSave}:{service:LaundryService;busy:boolean;onSave:(data:{id:string;price:string})=>Promise<boolean>}){
 const {t}=useI18n();
 return <form className="ld-inline-urgent" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);await onSave({id:service.id,price:String(data.get('price'))});}}><label>{t('سعر المستعجل بالريال')}<input aria-label={`${t('سعر المستعجل')} — ${service.name}`} name="price" type="number" inputMode="decimal" min={(service.price+1)/100} max="100000" step="0.01" required defaultValue={service.urgentPrice==null?'':(service.urgentPrice/100).toFixed(2)}/></label><button type="submit" className="ld-outline" disabled={busy}>{t('حفظ سعر المستعجل')}</button></form>;
}
