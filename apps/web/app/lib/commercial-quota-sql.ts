import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
export function commercialMonth(now=new Date()){
 const local=new Date(now.getTime()+3*3600000);
 const start=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),1)-3*3600000);
 const end=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+1,1)-3*3600000);
 return {start,end,period:start.toISOString()};
}
export function commercialQuotaKey(businessId:string,metric:string,period:string,id="total"){
 return `commercial:${createHash("sha256").update(JSON.stringify([businessId,metric,period,id])).digest("hex")}`;
}
export function incrementCommercialQuota(key:string,amount:number,limit:number,start:Date,now:Date){
 if(!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(limit)||limit<0||amount>limit)throw new Error("COMMERCIAL_LIMIT_REACHED");
 return Prisma.sql`INSERT INTO "RequestRateLimit" (key,"windowStart",count,"updatedAt") VALUES (${key},${start},${amount},${now}) ON CONFLICT (key) DO UPDATE SET count="RequestRateLimit".count+EXCLUDED.count,"updatedAt"=EXCLUDED."updatedAt" WHERE "RequestRateLimit".count<=${limit-amount} RETURNING count`;
}
