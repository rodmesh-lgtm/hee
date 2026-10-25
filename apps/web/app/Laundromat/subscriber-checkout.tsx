"use client";
import { useI18n } from "../../components/i18n/locale-provider";
import { useEffect,useState } from "react";
import type { getCashierSubscriptions } from "./package-actions";
import { quoteSubscriberOrder,packageUnitLabels,subscriberStatus,subscriberStatusLabels,type SubscriberBalance } from "../lib/accounting-packages";
import { laundryMoney as money,moneyToHalalas,type LaundryLine } from "../lib/laundry-domain";
export function SubscriberCheckout({businessId,phone,lines,paid,onReady,pricingReady=true}:{businessId:string;phone:string;lines:LaundryLine[];paid:string;onReady:(ready:boolean)=>void;pricingReady?:boolean}) {
 const { t: tr, intlLocale } = useI18n();

 const [result,setResult]=useState<{phone:string;subscriptions:SubscriberBalance[];error?:string}|null>(null),[enabled,setEnabled]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;if(phone.trim().length<8)return;const timer=setTimeout(()=>{void fetch("/api/accounting/subscriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,phone}),cache:"no-store"}).then(r=>r.json() as Promise<Awaited<ReturnType<typeof getCashierSubscriptions>>>).then(r=>{if(live)setResult({phone,subscriptions:r.ok?r.subscriptions:[],error:r.ok?undefined:r.error});}).catch(()=>{if(live)setResult({phone,subscriptions:[],error:"تعذر قراءة الاشتراكات"});});},350);return()=>{live=false;clearTimeout(timer);};},[businessId,phone,retry]);
 const ready=result?.phone===phone&&!result.error;

 let received=0;try{received=moneyToHalalas(paid);}catch{}
 let quote:ReturnType<typeof quoteSubscriberOrder>|null=null,quoteError="";
 if(pricingReady)try{quote=quoteSubscriberOrder(enabled&&ready?result.subscriptions:[],lines,received);}catch(e){quoteError=e instanceof Error?e.message:"راجع الطلب";}
 const valid=!!quote;useEffect(()=>{onReady((!enabled||!!ready)&&valid);},[enabled,ready,valid,onReady]);
 return <section className="ld-subscriber-checkout" aria-label={tr("اشتراكات العميل في الكاشير")}>
 <label className="ld-check-label"><input name="useSubscription" type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>{" "}{tr("استخدام رصيد اشتراك العميل تلقائيًا")}</label>
 <input type="hidden" name="subscriptionToken" value={enabled&&ready&&quote?quote.token:""}/>
 {quoteError?<p role="alert" className="ld-alert">{tr(quoteError)}</p>:null}
 <input type="hidden" name="subscriptionCovered" value={enabled?(ready&&quote?quote.covered:-1):0}/>
 {phone.trim().length<8?<p className="ld-fine">{tr("أدخل جوال العميل للتعرف على باقاته ورصيدها.")}</p>:!ready?<p className="ld-fine">{result?.phone===phone&&result.error?<>{result.error} <button className="ld-outline" type="button" onClick={()=>{setResult(null);setRetry(n=>n+1);}}>{tr("إعادة قراءة الرصيد")}</button></>:tr("جارٍ قراءة اشتراكات العميل…")}</p>:result.subscriptions.length?<><ul>{result.subscriptions.map(s=><li key={s.id}><strong>{s.name}</strong> · {tr(subscriberStatusLabels[subscriberStatus(s)])}{" "}{tr("· المتبقي")}{" "}{s.kind&&s.kind!=="credit"?`${s.unitsRemaining} ${tr(packageUnitLabels[s.kind])}`:`${money(s.remaining,intlLocale)} ر.س`}{" "}{tr("· حتى")}{" "}{new Date(s.expiresAt).toLocaleDateString(`${intlLocale}-u-ca-gregory`,{timeZone:"Asia/Riyadh"})}</li>)}</ul>{enabled&&quote?<><p>{tr("إجمالي الطلب بعد تسعير الباقات:")}{" "}<strong>{money(quote.total,intlLocale)}{" "}{tr("ر.س")}</strong></p><p>{tr("المغطى من الاشتراكات:")}{" "}<strong>{money(quote.covered,intlLocale)}{" "}{tr("ر.س")}</strong></p><p>{tr("المتبقي على الطلب بعد الدفعة والاشتراك:")}{" "}<strong>{money(quote.outstanding,intlLocale)}{" "}{tr("ر.س")}</strong></p>{quote.allocations.map(a=><p className="ld-fine" key={a.id}>{a.name}{tr(": سيبقى")}{" "}{a.kind!=="credit"?`${a.unitsRemaining} ${tr(packageUnitLabels[a.kind])}`:`${money(a.remaining,intlLocale)} ر.س`}{" "}{tr("بعد الحفظ")}</p>)}</>:null}</>:<p className="ld-fine">{tr("لا يوجد رصيد اشتراك لهذا العميل في المنشأة.")}</p>}
 {ready?<button type="button" className="ld-outline" onClick={()=>{setResult(null);setRetry(n=>n+1);}}>{tr("تحديث رصيد الاشتراكات")}</button>:null}
 <p className="ld-fine">{tr("يخصم العدد عند حفظ الطلب. كل كمية من الخدمة المحددة تستهلك قطعة أو زيارة واحدة؛ الزيارة ليست جميع أصناف الطلب. تُسعّر الوحدات المغطاة بحصتها من سعر الباقة")}{lines.some(line=>line.regularUnitPrice!==undefined)?tr("، ويُحتسب فرق المستعجل للوحدات المغطاة بصورة مستقلة"):""}{tr("، ثم يطبّق الرصيد المالي على الخدمات المتبقية. الدفعة المستلمة أدناه مبلغ جديد فقط؛ لا تشمل رصيد الاشتراك.")}</p>
 </section>;
}
