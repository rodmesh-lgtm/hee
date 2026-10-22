import { LaundryInputError, type LaundryLine } from "./laundry-domain";
export type AccountingPackage = {id:string;name:string;description:string;amount:number;durationDays:number;serviceIds:string[];active:boolean};
export type SubscriberBalance = {id:string;name:string;remaining:number;startsAt:string;expiresAt:string;serviceIds:string[]};
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
