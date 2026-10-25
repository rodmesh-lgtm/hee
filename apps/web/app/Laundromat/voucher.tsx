"use client";
import { useI18n } from "../../components/i18n/locale-provider";
import Image from "next/image";
import { useEffect,useRef,useState } from "react";
import { laundryMoney as money } from "../lib/laundry-domain";
export type LaundryVoucherData={id:string;title:string;party:string;amount:number;method:string;description:string;createdAt:string};
export function LaundryVoucher({business,voucher,onClose}:{business:{name:string;logoUrl:string|null;phone?:string;address?:string};voucher:LaundryVoucherData;onClose:()=>void}){
 const { t: tr, intlLocale } = useI18n();

 const dialog=useRef<HTMLDialogElement>(null);const [size,setSize]=useState("a4");
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
 return <div className="ld-overlay"><dialog ref={dialog} className="ld-dialog" aria-label={tr("سند العملية المالية")} onClose={onClose}><div className="ld-dialog-tools"><button autoFocus className="ld-outline" onClick={onClose}>{tr("إغلاق السند")}</button><label>{tr("مقاس طباعة السند")}<select aria-label={tr("مقاس طباعة السند")} value={size} onChange={e=>setSize(e.target.value)}><option value="a4">A4</option><option value="thermal">{tr("حراري 80 مم")}</option></select></label><button className="ld-primary" onClick={()=>window.print()}>{tr("طباعة السند")}</button></div><p className="ld-print-help">{tr("اختر مقاس الورق المطابق والمقياس 100٪، وأوقف رؤوس وتذييلات المتصفح.")}</p><div className={`ld-receipt ${size}`}><p className="ld-eyebrow">INFRO / LAUNDRY</p>{business.logoUrl?<Image unoptimized src={business.logoUrl} alt={tr("شعار المنشأة")} width={80} height={80} className="ld-receipt-logo"/>:null}<h2>{business.name}</h2>{business.address?<p>{business.address}</p>:null}{business.phone?<p dir="ltr">{business.phone}</p>:null}<h3>{tr(voucher.title)}</h3><p>{tr("مرجع السند:")}{" "}<span dir="ltr">{voucher.id}</span></p><p>{new Intl.DateTimeFormat(`${intlLocale}-u-ca-gregory`,{timeZone:"Asia/Riyadh",dateStyle:"medium",timeStyle:"short"}).format(new Date(voucher.createdAt))}</p><hr/><p>{tr("الطرف:")}{" "}<strong>{voucher.party}</strong></p><p>{voucher.description}</p><p>{tr("الطريقة:")}{" "}{tr(voucher.method)}</p><div className="ld-total"><span>{tr("المبلغ")}</span><strong>{money(voucher.amount,intlLocale)}{" "}{tr("ر.س")}</strong></div><hr/><p className="ld-fine">{tr("سند صادر من سجل المنشأة للعملية المالية الموضحة أعلاه.")}</p></div></dialog></div>;
}
