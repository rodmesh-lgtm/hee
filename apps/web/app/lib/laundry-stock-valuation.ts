import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { LaundryInputError } from "./laundry-domain";
import { laundryStockQuantity, laundryStockChange } from "./laundry-stock-domain";
import { postLaundryJournal } from "./laundry-ledger";

export async function requireLaundryValuationBook(tx:Prisma.TransactionClient,businessId:string){
 const book=await tx.$queryRaw<Array<{initializedAt:Date|null}>>`SELECT "initializedAt" FROM "LaundryBook" WHERE "businessId"=${businessId}`;
 if(!book[0]?.initializedAt)throw new LaundryInputError("أكمل تهيئة دفتر المحاسبة قبل تقييم المخزون");
}
export async function postLaundryStockValue(tx:Prisma.TransactionClient,input:{businessId:string;actorId:string;requestId:string;delta:number;opening?:boolean;reason:string}){
 await requireLaundryValuationBook(tx,input.businessId);
 if(!input.delta)return;
 const amount=Math.abs(input.delta),offset=input.opening?"3000":"5100";
 await postLaundryJournal(tx,{businessId:input.businessId,actorId:input.actorId,sourceKey:`stock-value:${input.requestId}`,description:input.reason,effectiveAt:new Date(),lines:input.delta>0?[{accountCode:"1300",debit:amount,credit:0},{accountCode:offset,debit:0,credit:amount}]:[{accountCode:offset,debit:amount,credit:0},{accountCode:"1300",debit:0,credit:amount}]});
}
// Called inside the same business-locked purchase transaction as its journal.
export async function receiveLaundryInventoryPurchase(tx:Prisma.TransactionClient,input:{businessId:string;actorId:string;requestId:string;purchaseId:string;itemId:string;warehouseId:string;quantity:string;value:number;reason:string}){
 const item=await tx.$queryRaw<Array<{unit:string}>>`SELECT unit FROM "LaundryStockItem" WHERE "businessId"=${input.businessId} AND id=${input.itemId}`;
 const warehouse=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryWarehouse" WHERE "businessId"=${input.businessId} AND id=${input.warehouseId}`;
 if(!item.length||!warehouse.length)throw new LaundryInputError("اختر مادة ومستودعًا من المنشأة النشطة");
 const quantity=laundryStockQuantity(input.quantity,item[0].unit);if(!quantity)throw new LaundryInputError("أدخل كمية الشراء الفعلية");
 await tx.$executeRaw`INSERT INTO "LaundryStockBalance" ("businessId","warehouseId","itemId") VALUES (${input.businessId},${input.warehouseId},${input.itemId}) ON CONFLICT DO NOTHING`;
 const [balance]=await tx.$queryRaw<Array<{quantity:number;value:number|null}>>`SELECT quantity::float8,value::float8 FROM "LaundryStockBalance" WHERE "businessId"=${input.businessId} AND "warehouseId"=${input.warehouseId} AND "itemId"=${input.itemId}`;
 if(balance.value===null&&balance.quantity>0)throw new LaundryInputError("قيّم الرصيد القديم لهذه المادة في المستودع قبل إضافة مشتريات مخزنية");
 const {after}=laundryStockChange(balance.quantity,quantity,"receipt"),value=(balance.value??0)+input.value;
 if(value>1e12)throw new LaundryInputError("قيمة المخزون تتجاوز الحد المسموح");
 await tx.$executeRaw`UPDATE "LaundryStockBalance" SET quantity=${after},value=${value},version=version+1 WHERE "businessId"=${input.businessId} AND "warehouseId"=${input.warehouseId} AND "itemId"=${input.itemId}`;
 await tx.$executeRaw`INSERT INTO "LaundryStockMovement" (id,"businessId","warehouseId","itemId","requestId",leg,kind,quantity,"balanceAfter",reason,"createdBy","valueDelta","purchaseId") VALUES (${randomUUID()},${input.businessId},${input.warehouseId},${input.itemId},${input.requestId},'single','receipt',${quantity},${after},${input.reason},${input.actorId},${input.value},${input.purchaseId})`;
}
