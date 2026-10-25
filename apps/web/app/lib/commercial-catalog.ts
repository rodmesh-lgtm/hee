import "server-only";
import type { Prisma } from "@prisma/client";
import { COMMERCIAL_PLANS } from "./commercial-plans";
/** Create new catalogue rows only: never reprice existing subscription/renewal terms. */
export async function ensureCommercialCatalog(tx:Prisma.TransactionClient) {
 for(const plan of COMMERCIAL_PLANS.filter(p=>p.code!=="FREE"))await tx.businessPlan.upsert({where:{code:plan.code},update:{},create:{code:plan.code,name:plan.name,monthlyPrice:plan.monthlyPrice,productLimit:plan.productLimit,aiEnabled:false,onlinePay:true,isActive:true}});
}
