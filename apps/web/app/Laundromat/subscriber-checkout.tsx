"use client";
import { useEffect,useState } from "react";
import type { getCashierSubscriptions } from "./package-actions";
import { allocateSubscriptions,subscriberStatus,subscriberStatusLabels,type SubscriberBalance } from "../lib/accounting-packages";
import { laundryMoney as money,moneyToHalalas,type LaundryLine } from "../lib/laundry-domain";
export function SubscriberCheckout({businessId,phone,lines,paid,onReady}:{businessId:string;phone:string;lines:Pick<LaundryLine,"serviceId"|"total">[];paid:string;onReady:(ready:boolean)=>void}) {
 const [result,setResult]=useState<{phone:string;subscriptions:SubscriberBalance[];error?:string}|null>(null),[enabled,setEnabled]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;if(phone.trim().length<8)return;const timer=setTimeout(()=>{void fetch("/api/accounting/subscriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,phone}),cache:"no-store"}).then(r=>r.json() as Promise<Awaited<ReturnType<typeof getCashierSubscriptions>>>).then(r=>{if(live)setResult({phone,subscriptions:r.ok?r.subscriptions:[],error:r.ok?undefined:r.error});}).catch(()=>{if(live)setResult({phone,subscriptions:[],error:"تعذر قراءة الاشتراكات"});});},350);return()=>{live=false;clearTimeout(timer);};},[businessId,phone,retry]);
 const ready=result?.phone===phone&&!result.error;
 useEffect(()=>{onReady(!enabled||!!ready);},[enabled,ready,onReady]);
 let received=0;try{received=moneyToHalalas(paid);}catch{}
 const total=lines.reduce((sum,line)=>sum+line.total,0);
 const quote=allocateSubscriptions(ready?result.subscriptions:[],lines,Math.max(0,total-received));
 return <section className="ld-subscriber-checkout" aria-label="اشتراكات العميل في الكاشير">
 <label className="ld-check-label"><input name="useSubscription" type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> استخدام رصيد اشتراك العميل تلقائيًا</label>
 <input type="hidden" name="subscriptionCovered" value={enabled?(ready?quote.covered:-1):0}/>
 {phone.trim().length<8?<p className="ld-fine">أدخل جوال العميل للتعرف على باقاته ورصيدها.</p>:!ready?<p className="ld-fine">{result?.phone===phone&&result.error?<>{result.error} <button className="ld-outline" type="button" onClick={()=>{setResult(null);setRetry(n=>n+1);}}>إعادة قراءة الرصيد</button></>:"جارٍ قراءة اشتراكات العميل…"}</p>:result.subscriptions.length?<><ul>{result.subscriptions.map(s=><li key={s.id}><strong>{s.name}</strong> · {subscriberStatusLabels[subscriberStatus(s)]} · المتبقي {money(s.remaining)} ر.س · حتى {new Date(s.expiresAt).toLocaleDateString("ar-SA-u-ca-gregory",{timeZone:"Asia/Riyadh"})}</li>)}</ul>{enabled?<><p>المغطى من الاشتراكات: <strong>{money(quote.covered)} ر.س</strong></p><p>المتبقي على الطلب بعد الدفعة والاشتراك: <strong>{money(quote.outstanding)} ر.س</strong></p>{quote.allocations.map(a=><p className="ld-fine" key={a.id}>{a.name}: سيبقى {money(a.remaining)} ر.س بعد الحفظ</p>)}</>:null}</>:<p className="ld-fine">لا يوجد رصيد اشتراك لهذا العميل في المنشأة.</p>}
 {ready?<button type="button" className="ld-outline" onClick={()=>{setResult(null);setRetry(n=>n+1);}}>تحديث رصيد الاشتراكات</button>:null}
 <p className="ld-fine">يخصم عند حفظ الطلب من الباقات الصالحة والخدمات المشمولة، بدءًا بالأقرب انتهاءً. الدفعة المستلمة أدناه مبلغ جديد فقط؛ لا تشمل رصيد الاشتراك.</p>
 </section>;
}
