import type { PrismaClient } from "@prisma/client";
/** Operational workflow fixtures now require a real active term, not Business.planId alone. */
export async function grantPaidWorkspace(db: PrismaClient, businessId: string) {
 const plan=await db.businessPlan.upsert({where:{code:"OPERATE_35"},update:{},create:{code:"OPERATE_35",name:"التشغيل",monthlyPrice:117,productLimit:10,isActive:true}});
 return db.subscription.create({data:{businessId,planId:plan.id,provider:"internal",status:"active",startsAt:new Date(Date.now()-60_000),endsAt:new Date(Date.now()+86400_000)}});
}
