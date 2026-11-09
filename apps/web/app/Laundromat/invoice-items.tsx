"use client";
import { useI18n } from "../../components/i18n/locale-provider";
import { CASHIER_UNITS,laundryMoney,type LaundryLine } from "../lib/laundry-domain";

export function InvoiceItems({items,discounted}:{items:LaundryLine[];discounted:boolean}){
 const {t,intlLocale}=useI18n();
 const money=(amount:number)=>laundryMoney(amount,intlLocale);
 const quantity=(line:LaundryLine)=><><bdi dir="ltr">{line.quantity}</bdi>{line.unit?<span className="ld-invoice-unit">{t(CASHIER_UNITS[line.unit])}</span>:null}</>;
 return <>
  <table className="ld-invoice-table" data-discounted={discounted}><colgroup><col className="ld-invoice-name-column"/>{Array.from({length:discounted?4:3},(_,index)=><col key={index}/>)}</colgroup><thead><tr><th scope="col">{t("الخدمة")}</th><th scope="col">{t("الكمية")}</th><th scope="col">{t("السعر")}</th>{discounted?<th scope="col">{t("الخصم")}</th>:null}<th scope="col">{t("المجموع")}</th></tr></thead><tbody>{items.map((line,index)=><tr key={`${line.serviceId}:${index}`}><td className="ld-invoice-item-name">{line.name}</td><td>{quantity(line)}</td><td><bdi dir="ltr">{money(line.unitPrice)}</bdi></td>{discounted?<td><bdi dir="ltr">{money(line.discount??0)}</bdi></td>:null}<td><bdi dir="ltr">{money(line.total)}</bdi></td></tr>)}</tbody></table>
  <div className="ld-thermal-lines" aria-label={t("أصناف الفاتورة")}>{items.map((line,index)=><article className="ld-thermal-item" key={`${line.serviceId}:${index}`}><strong className="ld-invoice-item-name">{line.name}</strong><dl data-discounted={discounted}><div><dt>{t("الكمية")}</dt><dd>{quantity(line)}</dd></div><div><dt>{t("السعر")}</dt><dd><bdi dir="ltr">{money(line.unitPrice)}</bdi></dd></div>{discounted?<div><dt>{t("الخصم")}</dt><dd><bdi dir="ltr">{money(line.discount??0)}</bdi></dd></div>:null}<div><dt>{t("المجموع")}</dt><dd><bdi dir="ltr">{money(line.total)}</bdi></dd></div></dl></article>)}</div>
 </>;
}
