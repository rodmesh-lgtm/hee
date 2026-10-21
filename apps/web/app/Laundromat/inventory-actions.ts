"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUser,getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { postLaundryStockValue } from "../lib/laundry-stock-valuation";
import { LaundryInputError,moneyToHalalas } from "../lib/laundry-domain";
import { laundryStockQuantity,laundryStockChange,laundryStockCost } from "../lib/laundry-stock-domain";
const uuid=z.string().uuid();
const commands=z.discriminatedUnion("type",[
 z.object({type:z.literal("valuation"),warehouseId:uuid,itemId:uuid,amount:z.string().max(20),reason:z.string().trim().min(4).max(300),expectedVersion:z.number().int().nonnegative()}),
 z.object({type:z.literal("warehouse"),name:z.string().trim().min(2).max(100)}),
 z.object({type:z.literal("item"),sku:z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),name:z.string().trim().min(2).max(100),unit:z.enum(["piece","liter","kg"]),reorderLevel:z.string().max(20)}),
 z.object({type:z.literal("movement"),warehouseId:uuid,itemId:uuid,kind:z.enum(["receipt","issue","count","transfer"]),quantity:z.string().max(20),reason:z.string().trim().min(4).max(300),destinationId:uuid.optional(),expectedVersion:z.number().int().nonnegative().optional(),adjustmentValue:z.string().max(20).optional()}),
]);
export async function laundryInventoryCommand(value:unknown):Promise<{ok:boolean;error?:string}>{
 const scope=z.object({businessId:uuid,requestId:uuid}).safeParse(value),p=commands.safeParse(value);if(!p.success||!scope.success)return {ok:false,error:"راجع بيانات المخزون وسبب الحركة"};
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يلزم حساب موثق"};
 const b=await getActiveBusinessForUser(user.id,p.data.type==="valuation"?"laundryAccounting":"laundryOperations");if(!b||b.id!==scope.data.businessId)return {ok:false,error:"المخزون يتطلب صلاحية إشراف المنشأة النشطة"};
 const d=p.data;
 try{await db.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${b.id}`}))`;
 const replay=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryAudit" WHERE "businessId"=${b.id} AND id=${scope.data.requestId} AND action=${`stock-${d.type}`}`;if(replay.length)return;
 let target=scope.data.requestId;
 if(d.type==="valuation"){
 const balances=await tx.$queryRaw<Array<{quantity:number;value:number|null;version:number}>>`SELECT quantity::float8,value::float8,version FROM "LaundryStockBalance" WHERE "businessId"=${b.id} AND "warehouseId"=${d.warehouseId} AND "itemId"=${d.itemId}`;
 const balance=balances[0];if(!balance)throw new LaundryInputError("سجل الرصيد الفعلي للمادة أولًا");
 if(balance.value!==null)throw new LaundryInputError("الرصيد مُقيّم بالفعل؛ صحّح الفرق بحركة جرد موثقة");
 if(balance.version!==d.expectedVersion)throw new LaundryInputError("تغير رصيد المادة؛ حدّث المخزون قبل التقييم");
 const value=moneyToHalalas(d.amount);if(!balance.quantity&&value)throw new LaundryInputError("الرصيد الصفري لا يحمل قيمة مالية");
 const totals=await tx.$queryRaw<Array<{book:number;stock:number}>>`SELECT (SELECT COALESCE(SUM(debit-credit),0) FROM "LaundryJournalLine" WHERE "businessId"=${b.id} AND "accountCode"='1300')::float8 AS book,(SELECT COALESCE(SUM(value),0) FROM "LaundryStockBalance" WHERE "businessId"=${b.id})::float8 AS stock`;
 if(totals[0].book!==totals[0].stock)throw new LaundryInputError("يوجد رصيد يدوي بحساب المخزون؛ راجعه وطابقه مع سجل المخزون قبل إضافة قيم افتتاحية لتجنب تكرارها");
 await postLaundryStockValue(tx,{businessId:b.id,actorId:user.id,requestId:scope.data.requestId,delta:value,opening:true,reason:`تقييم افتتاحي: ${d.reason}`.slice(0,300)});
 await tx.$executeRaw`UPDATE "LaundryStockBalance" SET value=${value},version=version+1 WHERE "businessId"=${b.id} AND "warehouseId"=${d.warehouseId} AND "itemId"=${d.itemId}`;
 await tx.$executeRaw`INSERT INTO "LaundryStockMovement" (id,"businessId","warehouseId","itemId","requestId",leg,kind,quantity,"balanceAfter",reason,"createdBy","valueDelta") VALUES (${randomUUID()},${b.id},${d.warehouseId},${d.itemId},${scope.data.requestId},'single','count',0,${balance.quantity},${`تقييم افتتاحي: ${d.reason}`},${user.id},${value})`;
 target=d.itemId;
 }else if(d.type==="warehouse"){
 const rows=await tx.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryWarehouse" WHERE "businessId"=${b.id}`;
 if(rows[0].n>=20)throw new LaundryInputError("وصلت إلى حد 20 مستودعًا");
 const duplicate=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryWarehouse" WHERE "businessId"=${b.id} AND name=${d.name}`;if(duplicate.length)throw new LaundryInputError("اسم المستودع مستخدم بالفعل");
 await tx.$executeRaw`INSERT INTO "LaundryWarehouse" (id,"businessId",name) VALUES (${target},${b.id},${d.name})`;
 }else if(d.type==="item"){
 const rows=await tx.$queryRaw<Array<{n:number}>>`SELECT COUNT(*)::int AS n FROM "LaundryStockItem" WHERE "businessId"=${b.id}`;if(rows[0].n>=500)throw new LaundryInputError("وصلت إلى حد 500 مادة في دليل المخزون");
 const sku=d.sku.toUpperCase(),reorder=laundryStockQuantity(d.reorderLevel,d.unit);
 const duplicate=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryStockItem" WHERE "businessId"=${b.id} AND sku=${sku}`;if(duplicate.length)throw new LaundryInputError("رمز المادة مستخدم بالفعل");
 await tx.$executeRaw`INSERT INTO "LaundryStockItem" (id,"businessId",sku,name,unit,"reorderLevel") VALUES (${target},${b.id},${sku},${d.name},${d.unit},${reorder})`;
 }else{
 const item=await tx.$queryRaw<Array<{unit:string}>>`SELECT unit FROM "LaundryStockItem" WHERE "businessId"=${b.id} AND id=${d.itemId}`;if(!item.length)throw new LaundryInputError("المادة ليست ضمن مخزون هذه المنشأة");
 const warehouses=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryWarehouse" WHERE "businessId"=${b.id}`;
 if(!warehouses.some(w=>w.id===d.warehouseId))throw new LaundryInputError("المستودع غير موجود في هذه المنشأة");
 if(d.kind==="transfer"&&(!d.destinationId||d.destinationId===d.warehouseId||!warehouses.some(w=>w.id===d.destinationId)))throw new LaundryInputError("اختر مستودعًا آخر من المنشأة للتحويل إليه");
 const qty=laundryStockQuantity(d.quantity,item[0].unit);
 if(d.kind!=="count"&&!qty)throw new LaundryInputError("كمية الحركة يجب أن تكون أكبر من صفر");
 let transferValue:number|null=null;
 const apply=async(warehouseId:string,kind:"receipt"|"issue"|"count",leg:"single"|"from"|"to")=>{
 await tx.$executeRaw`INSERT INTO "LaundryStockBalance" ("businessId","warehouseId","itemId") VALUES (${b.id},${warehouseId},${d.itemId}) ON CONFLICT DO NOTHING`;
 const stocks=await tx.$queryRaw<Array<{quantity:number;version:number;value:number|null}>>`SELECT quantity::float8,version,value::float8 FROM "LaundryStockBalance" WHERE "businessId"=${b.id} AND "warehouseId"=${warehouseId} AND "itemId"=${d.itemId}`;
 if(kind==="count"&&d.expectedVersion!==stocks[0].version)throw new LaundryInputError("تغير رصيد المادة منذ عرض الجرد. حدّث المخزون وأعد العد قبل التسوية");
 const {delta,after}=laundryStockChange(stocks[0].quantity,qty,kind);
 let value=stocks[0].value,valueDelta:number|null=null;
 if(d.kind==="transfer"&&leg==="to"){
  if(transferValue===null&&value!==null)throw new LaundryInputError("قيّم مخزون المصدر قبل نقله إلى مستودع مُقيّم");
  if(transferValue!==null){if(value===null&&stocks[0].quantity>0)throw new LaundryInputError("قيّم رصيد المستودع المستلم قبل التحويل إليه");valueDelta=transferValue;value=(value??0)+transferValue;}
 }else if(value!==null){
  if(kind==="receipt")throw new LaundryInputError("استلام المخزون المُقيّم يكون من فاتورة شراء مخزنية في المحاسبة");
  if(delta<0)valueDelta=-laundryStockCost(stocks[0].quantity,value,-delta);
  else if(delta>0){if(d.adjustmentValue===undefined||d.adjustmentValue.trim()==="")throw new LaundryInputError("أدخل التكلفة الموثقة للكمية الزائدة في الجرد");valueDelta=moneyToHalalas(d.adjustmentValue);}
  else valueDelta=0;
  value+=valueDelta;
  if(d.kind==="transfer")transferValue=-valueDelta;
 }
 if(value!==null&&value>1e12)throw new LaundryInputError("قيمة المخزون تتجاوز الحد المسموح");
 if(valueDelta!==null&&d.kind!=="transfer")await postLaundryStockValue(tx,{businessId:b.id,actorId:user.id,requestId:scope.data.requestId,delta:valueDelta,reason:`حركة مخزون: ${d.reason}`.slice(0,300)});
 if(delta||kind==="count"){await tx.$executeRaw`UPDATE "LaundryStockBalance" SET quantity=${after},value=${value},version=version+1 WHERE "businessId"=${b.id} AND "warehouseId"=${warehouseId} AND "itemId"=${d.itemId}`;
 await tx.$executeRaw`INSERT INTO "LaundryStockMovement" (id,"businessId","warehouseId","itemId","requestId",leg,kind,quantity,"balanceAfter",reason,"createdBy","valueDelta") VALUES (${randomUUID()},${b.id},${warehouseId},${d.itemId},${scope.data.requestId},${leg},${d.kind},${delta},${after},${d.reason},${user.id},${valueDelta})`;}
 };
 if(d.kind==="transfer"){await apply(d.warehouseId,"issue","from");await apply(d.destinationId!,"receipt","to");}else await apply(d.warehouseId,d.kind,"single");
 target=d.itemId;
 }
 await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${scope.data.requestId},${b.id},${user.id},${`stock-${d.type}`},${target})`;
 },{timeout:15000});revalidatePath("/Laundromat");return {ok:true};}catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر حفظ حركة المخزون. أعد المحاولة بنفس البيانات"};}
}
export type LaundryInventoryView={canValue:boolean;valuationSummary:{value:number;unvalued:number;ledger:number|null};warehouseId:string;warehouses:Array<{id:string;name:string}>;items:Array<{id:string;sku:string;name:string;unit:"piece"|"liter"|"kg";reorderLevel:number;quantity:number;version:number;value:number|null}>;movements:Array<{id:string;name:string;unit:"piece"|"liter"|"kg";kind:string;quantity:number;balanceAfter:number;valueDelta:number|null;reason:string;createdAt:string}>};
export async function getLaundryInventory(value:unknown):Promise<{ok:true;view:LaundryInventoryView}|{ok:false;error:string}>{
 const p=z.object({businessId:uuid,warehouseId:uuid.or(z.literal(""))}).safeParse(value);if(!p.success)return {ok:false,error:"حدد المنشأة والمستودع"};
 const user=await getCurrentUser();if(!user)return {ok:false,error:"يلزم تسجيل الدخول"};
 const accounting=await getActiveBusinessForUser(user.id,"laundryAccounting");
 const b=accounting??await getActiveBusinessForUser(user.id,"laundryOperations");if(!b||b.id!==p.data.businessId)return {ok:false,error:"المخزون يتطلب صلاحية إشراف المنشأة النشطة"};
 try{const view=await db.$transaction(async tx=>{
 const warehouses=await tx.$queryRaw<LaundryInventoryView["warehouses"]>`SELECT id,name FROM "LaundryWarehouse" WHERE "businessId"=${b.id} ORDER BY "createdAt",id`;
 const warehouseId=p.data.warehouseId||warehouses[0]?.id||"";if(warehouseId&&!warehouses.some(w=>w.id===warehouseId))throw new LaundryInputError("المستودع غير موجود في المنشأة");
 const items=await tx.$queryRaw<LaundryInventoryView["items"]>`SELECT i.id,i.sku,i.name,i.unit,i."reorderLevel"::float8,COALESCE(s.quantity,0)::float8 AS quantity,COALESCE(s.version,0)::int AS version,s.value::float8 FROM "LaundryStockItem" i LEFT JOIN "LaundryStockBalance" s ON s."businessId"=i."businessId" AND s."itemId"=i.id AND s."warehouseId"=${warehouseId} WHERE i."businessId"=${b.id} ORDER BY i.name,i.id LIMIT 500`;
 const movements=await tx.$queryRaw<Array<Omit<LaundryInventoryView["movements"][number],"createdAt">&{createdAt:Date}>>`SELECT m.id,i.name,i.unit,m.kind,m.quantity::float8,m."balanceAfter"::float8,m."valueDelta"::float8,m.reason,m."createdAt" FROM "LaundryStockMovement" m JOIN "LaundryStockItem" i ON i."businessId"=m."businessId" AND i.id=m."itemId" WHERE m."businessId"=${b.id} AND m."warehouseId"=${warehouseId} ORDER BY m."createdAt" DESC,m.id DESC LIMIT 100`;
 const totals=await tx.$queryRaw<Array<{value:number;unvalued:number;ledger:number}>>`SELECT (SELECT COALESCE(SUM(value),0)::float8 FROM "LaundryStockBalance" WHERE "businessId"=${b.id}) AS value,(SELECT COUNT(*)::int FROM "LaundryStockBalance" WHERE "businessId"=${b.id} AND value IS NULL AND quantity>0) AS unvalued,(SELECT COALESCE(SUM(debit-credit),0)::float8 FROM "LaundryJournalLine" WHERE "businessId"=${b.id} AND "accountCode"='1300') AS ledger`;
 return {canValue:!!accounting,valuationSummary:{...totals[0],ledger:accounting?totals[0].ledger:null},warehouseId,warehouses,items,movements:movements.map(m=>({...m,createdAt:m.createdAt.toISOString()}))};
 },{isolationLevel:"RepeatableRead",timeout:15000});return {ok:true,view};}catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر قراءة المخزون"};}
}
