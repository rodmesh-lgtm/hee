
export const CASHIER_NOTICES = [
 {trigger:"cashier_pickup_reminder",name:"infro_pickup_reminder",label:"تذكير الاستلام",hours:24,consent:"order-reminder-consent",body:"مرحبًا {{1}}، نذكرك بأن طلبك رقم {{3}} لدى {{2}} جاهز للاستلام منذ يوم. شكرًا لك."},
 {trigger:"cashier_payment_reminder",name:"infro_payment_reminder",label:"تذكير المبلغ المتبقي",hours:24,consent:"order-reminder-consent",body:"مرحبًا {{1}}، تبقى مبلغ {{4}} ر.س على طلبك الجاهز للاستلام رقم {{3}} لدى {{2}}. يرجى التواصل معنا لترتيب السداد."},
 {trigger:"cashier_review_request",name:"infro_order_review",label:"طلب تقييم الخدمة",hours:2,consent:"order-review-consent",body:"مرحبًا {{1}}، نرغب بمعرفة رأيك في خدمة طلبك رقم {{3}} لدى {{2}}. شارك تقييمك عبر {{4}}. شكرًا لوقتك."},
] as const;
export function cashierNotice(type:string){return CASHIER_NOTICES.find(n=>n.trigger===type);}
export function cashierNoticeEvent(e:{triggerType:string;source:string;subjectType:string}){return Boolean(cashierNotice(e.triggerType)&&e.source==="cashier.followup"&&e.subjectType===e.triggerType);}
export function reviewUrl(value:unknown){try{const u=new URL(String(value??""));return u.protocol==="https:"&&!u.username&&!u.password&&u.href.length<=500?u.href:null;}catch{return null;}}
export function cashierNoticeTemplateSupported(type:string,t:{name:string;category:string;components:unknown;parameterFormat?:string|null}){
 const n=cashierNotice(type);if(!n||t.name!==n.name||!(t.category==="utility"||(type==="cashier_review_request"&&t.category==="marketing"))||!Array.isArray(t.components)||(t.parameterFormat&&t.parameterFormat.toUpperCase()!=="POSITIONAL"))return false;
 const count=type==="cashier_pickup_reminder"?3:4;let bodies=0;
 for(const raw of t.components){if(!raw||typeof raw!=="object"||Array.isArray(raw))return false;const c=raw as Record<string,unknown>,type=String(c.type??"").toUpperCase();
  if(type==="BODY"){bodies++;const fields:string[]=typeof c.text==="string"?c.text.match(/\{\{[^{}]+\}\}/g)??[]:[];if(fields.length!==count||Array.from({length:count},(_,i)=>`{{${i+1}}}`).some(f=>!fields.includes(f)))return false;}
  else if(type==="FOOTER"||(type==="HEADER"&&String(c.format??"").toUpperCase()==="TEXT")){if(typeof c.text!=="string"||/\{\{/.test(c.text))return false;}else return false;
 }return bodies===1;
}
export type CashierNoticeTicket={id:string;number:number;phone:string;customerName:string;businessName:string;remaining:number};
export function cashierNoticeParameters(type:string,t:CashierNoticeTicket,url?:string|null){
 const clean=(v:string)=>v.normalize("NFKC").replace(/\s+/g," ").trim().slice(0,500);
 const values=[t.customerName||"عميلنا العزيز",t.businessName,String(t.number)];
 if(type==="cashier_payment_reminder")values.push((t.remaining/100).toFixed(2));
 if(type==="cashier_review_request"){if(!reviewUrl(url))return null;values.push(url!);}
 return [{type:"body",parameters:values.map(text=>({type:"text",text:clean(text)}))}];
}
