"use client";
import { useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../../components/i18n/locale-provider";
import { getInvoiceReturns,invoiceReturnCommand,type ReturnView } from "./return-actions";
import { invoiceBalance } from "../lib/cashier-return";
import { CASHIER_UNITS, laundryMoney } from "../lib/laundry-domain";
import { LaundryVoucher,type LaundryVoucherData } from "./voucher";

export function CashierReturns({business,initialNumber}:{business:{id:string;name:string;logoUrl:string|null;phone?:string;address?:string};initialNumber?:number}){
 const {t,intlLocale}=useI18n(),router=useRouter();
 const [view,setView]=useState<ReturnView|null>(null),[busy,setBusy]=useState(!!initialNumber),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [voucher,setVoucher]=useState<LaundryVoucherData|null>(null);
 useEffect(()=>{
  if(!initialNumber)return;
  let live=true;
  void getInvoiceReturns({businessId:business.id,number:initialNumber}).then(result=>{if(!live)return;if(result.ok)setView(result.view);else {setView(null);setError(result.error);}}).catch(()=>{if(live)setError("تعذر الاتصال");}).finally(()=>{if(live)setBusy(false);});
  return()=>{live=false;};
 },[business.id,initialNumber]);
 const pending=useRef<{body:string;id:string}|null>(null);
 const money=(v:number)=>laundryMoney(v,intlLocale),labels:Record<string,string>={cash:"نقد",card:"شبكة",transfer:"تحويل",prepaid:"رصيد الاشتراك"};
 async function load(number:number){
  const result=await getInvoiceReturns({businessId:business.id,number});if(result.ok)setView(result.view);else {setView(null);setError(result.error);}
 }
 async function run(body:Record<string,unknown>){
  if(busy||!view)return;setBusy(true);setError("");setNotice("");
  const full={...body,businessId:business.id,ticketId:view.ticket.id},signature=JSON.stringify(full);
  if(!pending.current||pending.current.body!==signature)pending.current={body:signature,id:crypto.randomUUID()};
  try{const r=await invoiceReturnCommand({...full,requestId:pending.current.id});if(!r.ok){setError(r.error??"تعذر الحفظ");return;}pending.current=null;setNotice(body.type==="return"?"تم حفظ المرتجع. راجع المبلغ المستحق للإعادة أدناه":"تم توثيق إعادة المبلغ");await load(view.ticket.number);router.refresh();}catch{setError("تعذر الاتصال؛ أعد المحاولة بنفس البيانات");}finally{setBusy(false);}
 }
 const balance=view?invoiceBalance(view.ticket):null;
 return <section className="ld-panel">
  <div className="ld-panel-title"><h2>{t("مرتجعات الفواتير")}</h2><span>{t("كامل أو جزئي · مرتبط بالفاتورة الأصلية")}</span></div>
  <p className="ld-fine">{t("اختر الفاتورة، ثم الأصناف والكميات وسبب الإرجاع. يُعاد رصيد الاشتراك تلقائيًا عند استحقاقه، ويُوثّق رد النقد أو الشبكة أو التحويل بعد تنفيذه فعليًا.")}</p>
  <form className="ld-inline-form" onSubmit={async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setError("");setNotice("");try{await load(Number(f.get("number")));}catch{setError("تعذر الاتصال");}finally{setBusy(false);}}}>
   <label>{t("رقم الفاتورة")}<input name="number" type="number" min="1" required defaultValue={initialNumber}/></label><button disabled={busy} className="ld-primary">{t("استعراض الفاتورة والمرتجعات")}</button>
  </form>
  {busy&&!view?<p role="status" className="ld-fine">{t("جارٍ استعراض الفاتورة والمرتجعات…")}</p>:null}
  {error?<p className="ld-alert" role="alert">{t(error)}</p>:null}{notice?<p className="ld-success" role="status">{t(notice)}</p>:null}
  {view&&balance?<div key={`${view.ticket.id}:${view.returns.length}:${view.refunds.length}`}>
   <h3>{t("فاتورة")} #{view.ticket.number} · {view.ticket.customerName}</h3>
   <div className="ld-report-summary">{[["قيمة الفاتورة الأصلية",view.ticket.total],["إجمالي المرتجعات",view.ticket.returned],["الصافي بعد المرتجعات",balance.net],["المتبقي على العميل",balance.outstanding],["المعاد فعليًا أو إلى الاشتراك",view.ticket.refunded],["مبلغ مستحق للإعادة",balance.refundDue]].map(([label,v])=><article key={String(label)}><span>{t(String(label))}</span><strong>{money(Number(v))} {t("ر.س")}</strong></article>)}</div>
   {balance.net>0?<form aria-label={t("تحديد أصناف المرتجع")} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const items=view.ticket.items.flatMap((_,index)=>{const quantity=Number(f.get(`quantity-${index}`));return quantity?[{index,quantity}]:[];});void run({type:"return",items,reason:String(f.get("reason")??"")});}}>
    <div className="ld-return-shortcuts"><button type="button" className="ld-outline" disabled={busy} onClick={e=>{e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name^="quantity-"]:not(:disabled)').forEach(input=>{input.value=input.max;});}}>{t("تعبئة المرتجع الكامل")}</button><button type="button" className="ld-outline" disabled={busy} onClick={e=>{e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name^="quantity-"]:not(:disabled)').forEach(input=>{input.value="0";});}}>{t("تصفير كميات المرتجع")}</button></div>
    <div className="ld-table-wrap"><table><thead><tr><th>{t("الصنف")}</th><th>{t("السعر")}</th><th>{t("القابل للإرجاع")}</th><th>{t("كمية المرتجع")}</th></tr></thead><tbody>{view.ticket.items.map((line,index)=>{const returned=view.returns.flatMap(r=>r.items).filter(l=>l.index===index).reduce((s,l)=>s+l.quantity,0),available=Math.round((line.quantity-returned)*100)/100;return <tr key={index}><td>{line.name}</td><td>{money(line.unitPrice)}</td><td>{available} {line.unit?t(CASHIER_UNITS[line.unit]):""}</td><td><input aria-label={`${t("كمية مرتجع")} ${index+1}`} name={`quantity-${index}`} type="number" min="0" max={available} step={line.unit&&line.unit!=="piece"?"0.01":"1"} defaultValue="0" disabled={!available||busy}/></td></tr>;})}</tbody></table></div>
    <label>{t("سبب المرتجع")}<input name="reason" required minLength={4} maxLength={300}/></label>
    <p className="ld-fine">{t("زر تعبئة المرتجع الكامل يحدد الكميات المتبقية فقط؛ لا يُعتمد المرتجع إلا بعد إدخال السبب والضغط على اعتماد. فواتير باقات القطع والزيارات تتطلب مرتجعًا كاملًا لاستعادة وحداتها دون تخمين. هذا الإجراء لا يعيد مواد المخزون تلقائيًا؛ راجع حركة المخزون الفعلية إن وجدت.")}</p>
    <button className="ld-primary" disabled={busy}>{t("اعتماد المرتجع وتحديث الرصيد")}</button>
   </form>:<p className="ld-success">{t("هذه الفاتورة مرتجعة بالكامل")}</p>}
   {balance.refundDue>0?<section className="ld-panel"><h3>{t("توثيق إعادة المبلغ")}</h3><p>{t("هذا الزر يسجل مبلغًا أعدته بالفعل. لا يُرسل طلب استرداد إلى البنك أو جهاز مدى.")}</p>
    <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({type:"refund",paymentId:String(f.get("paymentId")),amount:String(f.get("amount")),reference:String(f.get("reference")),confirmed:f.get("confirmed")==="on"});}}>
     <label>{t("الدفعة الأصلية")}<select name="paymentId" aria-label={t("الدفعة الأصلية")} required>{view.payments.filter(p=>p.method!=="prepaid"&&p.available>0).map(p=><option key={p.id} value={p.id}>{t(labels[p.method])} · {money(p.available)} {t("ر.س")}</option>)}</select></label>
     <label>{t("المبلغ المعاد")}<input name="amount" type="number" min="0.01" max={balance.refundDue/100} step="0.01" required/></label>
     <label>{t("مرجع الإعادة أو سند الصرف")}<input name="reference" minLength={4} maxLength={300} required/></label>
     <label><input name="confirmed" type="checkbox" required/> {t("أؤكد إعادة المبلغ فعليًا بنفس وسيلة الدفعة المختارة")}</label>
     <button className="ld-primary" disabled={busy}>{t("تسجيل المبلغ المعاد فعليًا")}</button>
    </form>
   </section>:null}
   <h3>{t("مستندات المرتجع")}</h3>{view.returns.map(r=><div className="ld-service-row" key={r.id}><div><strong>#{r.number} · {money(r.amount)} {t("ر.س")}</strong><small>{r.reason}</small></div><button type="button" className="ld-outline" onClick={()=>setVoucher({id:r.id,title:`مستند مرتجع #${r.number} — الفاتورة #${view.ticket.number}`,party:view.ticket.customerName,amount:r.amount,method:"تسوية قيمة الفاتورة؛ لا يثبت صرف المبلغ",description:`${r.reason}\n${r.items.map(l=>`${l.name}: ${l.quantity}${l.unit?` ${t(CASHIER_UNITS[l.unit])}`:""} · ${money(l.amount)} ر.س`).join("\n")}`,createdAt:r.createdAt})}>{t("عرض وطباعة المرتجع")}</button></div>)}
   <h3>{t("سجل المبالغ المعادة")}</h3>{view.refunds.map(r=><div className="ld-service-row" key={r.id}><span>{t(labels[r.method])} · {money(r.amount)} {t("ر.س")}<small>{r.reference}</small></span><button type="button" className="ld-outline" onClick={()=>setVoucher({id:r.id,title:`سند إعادة مبلغ — الفاتورة #${view.ticket.number}`,party:view.ticket.customerName,amount:r.amount,method:labels[r.method],description:r.reference,createdAt:r.createdAt})}>{t("عرض سند الإعادة")}</button></div>)}
  </div>:null}
  {voucher?<LaundryVoucher business={business} voucher={voucher} onClose={()=>setVoucher(null)}/>:null}
 </section>;
}
