import "server-only";
import type { Prisma,PrismaClient } from "@prisma/client";
import { getEffectiveSubscription } from "./subscription-entitlement";
import { getPlanEntitlements } from "./plan-entitlements";
export async function commercialAccess(businessId:string,database?:Prisma.TransactionClient|PrismaClient){
 const subscription=await getEffectiveSubscription({businessId,database});
 return getPlanEntitlements(subscription?.plan.code);
}
