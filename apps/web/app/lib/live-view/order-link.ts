import type {Prisma} from "@prisma/client";
import {LIVE_VIEW_COOLDOWN_MS} from "./policy";
/** Caller holds laundry:<businessId>; creation takes the same lock before station locks. */
export async function endOrderLiveSessions(tx:Prisma.TransactionClient,businessId:string,ticketId:string,actorUserId:string){
 const links=await tx.whatsAppAuditLog.findMany({where:{businessId,action:"live-view.order.linked",metadata:{path:["ticketId"],equals:ticketId}},select:{targetId:true}});
 const ids=links.map(l=>l.targetId).filter((id):id is string=>Boolean(id));if(!ids.length)return 0;
 const sessions=await tx.liveViewSession.findMany({where:{businessId,id:{in:ids},endedAt:null},orderBy:{stationId:"asc"},select:{id:true,stationId:true}});
 const now=new Date();let count=0;
 for(const s of sessions){
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view:${s.stationId}`}))`;
  const changed=await tx.liveViewSession.updateMany({where:{businessId,id:s.id,endedAt:null},data:{endedAt:now}});
  if(!changed.count)continue;
  await tx.liveViewStation.updateMany({where:{businessId,id:s.stationId},data:{reuseAfterAt:new Date(now.getTime()+LIVE_VIEW_COOLDOWN_MS)}});
  await tx.whatsAppAuditLog.create({data:{businessId,actorUserId,action:"live-view.order.completed",targetType:"live-view",targetId:s.id,outcome:"success",metadata:{ticketId}}});count++;
 }return count;
}
