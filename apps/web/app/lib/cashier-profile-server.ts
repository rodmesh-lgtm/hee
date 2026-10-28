import "server-only";
import type { Prisma,PrismaClient } from "@prisma/client";
import { db } from "./db";
import {cashierActivityProfile,isClothingPresetService,type CashierBusinessActivity} from "./cashier-activity";
/** Called only after the caller resolves the authenticated active business. Never infer from another tenant. */
export async function cashierProfileForBusiness(business:CashierBusinessActivity&{id:string},database:PrismaClient|Prisma.TransactionClient=db) {
 const declared=cashierActivityProfile(business);
 if(declared.id!=="general"&&declared.id!=="services")return declared;
 const ownServices=await database.$queryRaw<Array<{name:string;category:string}>>`SELECT name,category FROM "LaundryService" WHERE "businessId"=${business.id} AND active=TRUE AND id NOT LIKE 'urgent:%'`;
 return cashierActivityProfile(business,ownServices.some(isClothingPresetService));
}
