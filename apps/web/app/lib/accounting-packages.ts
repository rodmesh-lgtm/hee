import { LaundryInputError, type LaundryLine } from "./laundry-domain";
export type PackageKind = "credit"|"pieces"|"visits";
export const packageUnitLabels={credit:"ر.س",pieces:"قطعة",visits:"زيارة"};
export type AccountingPackage = {kind?:PackageKind;unitsIncluded?:number|null;id:string;name:string;description:string;amount:number;durationDays:number;serviceIds:string[];active:boolean};
export type SubscriberBalance = {kind?:PackageKind;unitsIncluded?:number|null;unitsRemaining?:number|null;id:string;name:string;remaining:number;startsAt:string;expiresAt:string;serviceIds:string[]};
export function subscriberStatus(s:SubscriberBalance,now=new Date()) {
 if(s.remaining===0)return "exhausted";
 if(new Date(s.startsAt)>now)return "scheduled";
 return new Date(s.expiresAt)<=now?"expired":"active";
}
export const subscriberStatusLabels={active:"نشط",scheduled:"لم يبدأ",expired:"منتهي الصلاحية",exhausted:"نفد الرصيد"};
export function packagePeriod(start:string,days:number,now=new Date()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(days)||days<1||days>366)throw new LaundryInputError("راجع تاريخ بداية الباقة ومدتها");
 const startsAt=new Date(`${start}T00:00:00+03:00`);
 if(!Number.isFinite(startsAt.getTime())||new Date(startsAt.getTime()+10800000).toISOString().slice(0,10)!==start)throw new LaundryInputError("تاريخ البداية غير صالح");
 const today=new Date(now.getTime()+10800000).toISOString().slice(0,10);
 if(start<today||startsAt.getTime()>now.getTime()+366*86400000)throw new LaundryInputError("اختر بداية من اليوم وخلال السنة القادمة");
 return {startsAt,expiresAt:new Date(startsAt.getTime()+days*86400000)};
}
// Only used for a new order: no earlier payments/allocations exist on its lines.
export function allocateSubscriptions(subscriptions:SubscriberBalance[],lines:Pick<LaundryLine,"serviceId"|"total">[],outstanding:number,now=new Date()) {
 if(!Number.isSafeInteger(outstanding)||outstanding<0||lines.some(l=>!Number.isSafeInteger(l.total)||l.total<0))throw new LaundryInputError("مبلغ الطلب غير صالح");
 const valid=subscriptions.filter(s=>subscriberStatus(s,now)==="active"&&Number.isSafeInteger(s.remaining)&&s.remaining>0).sort((a,b)=>a.expiresAt.localeCompare(b.expiresAt)||a.id.localeCompare(b.id));
 // Residual paths can move unrestricted credit to another line, leaving restricted
 // credit usable. A simple FIFO loop can incorrectly leave an otherwise covered debt.
 type Edge={to:number;reverse:number;capacity:number};
 const source=0,budget=1,firstPackage=2,firstLine=firstPackage+valid.length,sink=firstLine+lines.length;
 const graph:Edge[][]=Array.from({length:sink+1},()=>[]);
 function connect(from:number,to:number,capacity:number){
  const edge:Edge={to,reverse:graph[to].length,capacity};
  graph[from].push(edge);graph[to].push({to:from,reverse:graph[from].length-1,capacity:0});return edge;
 }
 connect(source,budget,outstanding);
 const packageEdges=valid.map((s,i)=>{
  const edge=connect(budget,firstPackage+i,s.remaining);
  lines.forEach((line,j)=>{if(!s.serviceIds.length||s.serviceIds.includes(line.serviceId))connect(firstPackage+i,firstLine+j,line.total);});
  return edge;
 });
 lines.forEach((line,j)=>connect(firstLine+j,sink,line.total));
 let covered=0;
 while(covered<outstanding){
  const parent:Array<{node:number;edge:number}|undefined>=Array(graph.length);parent[source]={node:source,edge:0};
  const queue=[source];
  for(let q=0;q<queue.length&&!parent[sink];q++){
   const node=queue[q];graph[node].forEach((edge,i)=>{if(edge.capacity>0&&!parent[edge.to]){parent[edge.to]={node,edge:i};queue.push(edge.to);}});
  }
  if(!parent[sink])break;
  let amount=outstanding-covered;
  for(let node=sink;node!==source;){const p=parent[node]!;amount=Math.min(amount,graph[p.node][p.edge].capacity);node=p.node;}
  for(let node=sink;node!==source;){const p=parent[node]!,edge=graph[p.node][p.edge];edge.capacity-=amount;graph[node][edge.reverse].capacity+=amount;node=p.node;}
  covered+=amount;
 }
 const allocations=valid.flatMap((s,i)=>{const amount=s.remaining-packageEdges[i].capacity;return amount?[{id:s.id,name:s.name,amount,remaining:s.remaining-amount}]:[];});
 return {allocations,covered,outstanding:outstanding-covered};
}
export function assertSubscriptionServices(serviceIds:string[],lines:Pick<LaundryLine,"serviceId">[]) {
 if(serviceIds.length&&(!lines.length||lines.some(l=>!serviceIds.includes(l.serviceId))))throw new LaundryInputError("الطلب يحتوي خدمات خارج الباقة؛ استخدم الخصم التلقائي عند إنشاء طلب بالخدمات المشمولة");
}

export function countedValue(remaining:number,unitsRemaining:number,units:number) {
 if(!Number.isSafeInteger(remaining)||!Number.isSafeInteger(unitsRemaining)||!Number.isSafeInteger(units)||units<1||unitsRemaining<units||remaining<unitsRemaining)throw new LaundryInputError("رصيد وحدات الباقة غير صالح");
 return Math.floor(remaining*units/unitsRemaining);
}
export function quoteSubscriberOrder(subscriptions:SubscriberBalance[],lines:LaundryLine[],paid:number,now=new Date()) {
 if(!Number.isSafeInteger(paid)||paid<0||lines.some(l=>!Number.isSafeInteger(l.quantity)||l.quantity<1||!Number.isSafeInteger(l.unitPrice)||l.unitPrice<0||l.total!==l.quantity*l.unitPrice||(l.regularUnitPrice!==undefined&&(!Number.isSafeInteger(l.regularUnitPrice)||l.regularUnitPrice<0||l.regularUnitPrice>l.unitPrice))))throw new LaundryInputError("راجع كميات الطلب والدفعة");
 const remainingLines=lines.map(l=>({...l})),packageLines:LaundryLine[]=[],urgentLines:LaundryLine[]=[];
 const allocations:Array<{id:string;name:string;amount:number;remaining:number;units:number;unitsRemaining:number|null;kind:PackageKind}>=[];
 const counted=subscriptions.filter(s=>s.kind&&s.kind!=="credit"&&subscriberStatus(s,now)==="active").sort((a,b)=>a.expiresAt.localeCompare(b.expiresAt)||a.id.localeCompare(b.id));
 for(const s of counted){
  if(s.serviceIds.length!==1||!s.unitsRemaining)continue;
  const line=remainingLines.find(l=>l.serviceId===s.serviceIds[0]);if(!line?.quantity)continue;
  const units=Math.min(line.quantity,s.unitsRemaining),amount=countedValue(s.remaining,s.unitsRemaining,units);
  const price=Math.floor(amount/units),extra=amount%units;
  // Two integer-priced rows preserve exact halalas without fractional unit prices.
  for(const [quantity,unitPrice] of [[units-extra,price],[extra,price+1]])if(quantity)packageLines.push({...line,name:`${line.name} — ${s.name}`,quantity,unitPrice,total:quantity*unitPrice});
  const urgentFee=line.regularUnitPrice===undefined?0:line.unitPrice-line.regularUnitPrice;
  if(urgentFee>0)urgentLines.push({...line,name:`فرق المستعجل — ${line.name}`,quantity:units,unitPrice:urgentFee,total:units*urgentFee});
  line.quantity-=units;line.total=line.quantity*line.unitPrice;
  allocations.push({id:s.id,name:s.name,amount,remaining:s.remaining-amount,units,unitsRemaining:s.unitsRemaining-units,kind:s.kind!});
 }
 const uncovered=[...remainingLines.filter(l=>l.quantity>0),...urgentLines],retail=uncovered.reduce((sum,l)=>sum+l.total,0);
 if(paid>retail)throw new LaundryInputError("الدفعة الجديدة تتجاوز الخدمات غير المغطاة بالباقة؛ خفّض الدفعة أو أوقف استخدام الاشتراك");
 const credit=allocateSubscriptions(subscriptions.filter(s=>!s.kind||s.kind==="credit"),uncovered,retail-paid,now);
 allocations.push(...credit.allocations.map(a=>({...a,units:0,unitsRemaining:null,kind:"credit" as const})));
 const adjustedLines=[...uncovered,...packageLines],total=adjustedLines.reduce((sum,l)=>sum+l.total,0),covered=allocations.reduce((sum,a)=>sum+a.amount,0);
 return {lines:adjustedLines,total,covered,outstanding:total-paid-covered,allocations,token:JSON.stringify(allocations.map(a=>[a.id,a.amount,a.remaining,a.units,a.unitsRemaining]))};
}
