"use client";
import {useI18n} from '../../components/i18n/locale-provider';
import {CASHIER_UNITS,type CashierUnit} from '../lib/laundry-domain';
export function CashierUnitField({value='piece'}:{value?:CashierUnit}){
 const {t}=useI18n();return <label>{t('وحدة الصنف')}<select name="unit" aria-label={t('وحدة الصنف')} defaultValue={value}>{Object.entries(CASHIER_UNITS).map(([key,label])=><option key={key} value={key}>{t(label)}</option>)}</select></label>;
}
