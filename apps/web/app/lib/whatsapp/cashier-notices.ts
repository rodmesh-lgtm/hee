import "server-only";
import {cashierNoticeTicketsQuery} from "./cashier-notice-query";
import type {Prisma,PrismaClient} from "@prisma/client";
import {db} from "../db";
import {commercialAccess} from "../commercial-access";
import {CASHIER_NOTICES,cashierNoticeEvent,cashierNoticeParameters,type CashierNoticeTicket} from "./cashier-notice-domain";
type ReadDb=Pick<Prisma.TransactionClient,"$queryRaw">;
export async function cashierNoticeContext(database:ReadDb,event:{triggerType:string;source:string;subjectType:string;subjectId:string},businessId:string,phone:string,activatedAt:Date|null,config:unknown,now=new Date()){
 if(!cashierNoticeEvent(event)||!activatedAt)return null;
 const rows=await database.$queryRaw<CashierNoticeTicket[]>(cashierNoticeTicketsQuery({businessId,trigger:event.triggerType,activatedAt,now,ticketId:event.subjectId,phone,limit:1}));
 const url=config&&typeof config==="object"?String((config as Record<string,unknown>).reviewUrl??""):null;
 return rows[0]?cashierNoticeParameters(event.triggerType,rows[0],url):null;
}
export async function scheduleCashierNotices({database=db,now=new Date()}:{database?:PrismaClient;now?:Date}={}){
 const settings=await database.whatsAppAutomation.findMany({where:{triggerType:{in:CASHIER_NOTICES.map(n=>n.trigger)},status:"active",connection:{status:"connected",provider:"meta",disabledAt:null,OR:[{bookingEnabled:true},{marketingEnabled:true}]}},orderBy:{updatedAt:"asc"},take:100,select:{id:true,businessId:true,triggerType:true,activatedAt:true}});
 let emitted=0;
 for(const a of settings){if(emitted>=500)break;
 await database.whatsAppAutomation.updateMany({where:{id:a.id,businessId:a.businessId,status:"active"},data:{updatedAt:now}});
 if(!a.activatedAt||!(await commercialAccess(a.businessId,database)).cashier)continue;
 const tickets=await database.$queryRaw<CashierNoticeTicket[]>(cashierNoticeTicketsQuery({businessId:a.businessId,trigger:a.triggerType,activatedAt:a.activatedAt,now,pendingOnly:true}));
 for(const t of tickets){if(emitted>=500)break;
  // Stable per-order keys prevent retries, polling, and setting changes from creating a second notice.
  const externalEventId=`${t.id}:${a.triggerType}`;
  const existing=await database.whatsAppAutomationEvent.findUnique({where:{businessId_source_externalEventId:{businessId:a.businessId,source:"cashier.followup",externalEventId}},select:{id:true}});if(existing)continue;
  const contact=await database.whatsAppContact.upsert({where:{businessId_phoneE164:{businessId:a.businessId,phoneE164:t.phone}},create:{businessId:a.businessId,phoneE164:t.phone,displayName:t.customerName,source:"integration"},update:{},select:{id:true,optedOutAt:true,deletedAt:true}});if(contact.optedOutAt||contact.deletedAt)continue;
  await database.whatsAppAutomationEvent.upsert({where:{businessId_source_externalEventId:{businessId:a.businessId,source:"cashier.followup",externalEventId}},create:{businessId:a.businessId,automationId:a.id,source:"cashier.followup",externalEventId,triggerType:a.triggerType,subjectType:a.triggerType,subjectId:t.id,contactId:contact.id,occurredAt:now},update:{}});emitted++;
 }

 }return {emitted,scanned:settings.length};
}
