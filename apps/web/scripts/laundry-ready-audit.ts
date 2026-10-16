import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {db} from "../app/lib/db";
import {enqueueLaundryReady,laundryReadyContext} from "../app/lib/whatsapp/laundry-ready";
import {LAUNDRY_READY_TEMPLATE_EXAMPLE} from "../app/lib/whatsapp/laundry-ready-domain";
import {processWhatsAppAutomationEvent} from "../app/lib/whatsapp/automation-processor";
import {processNextWhatsAppAutomationDelivery} from "../app/lib/whatsapp/automation-delivery-worker";
if(process.env.APP_ENV!=="test"||process.env.ALLOW_LAUNDRY_READY_AUDIT!=="true")throw new Error("Disposable test runtime required");
async function main(){
 const user=await db.user.create({data:{name:"Ready audit",email:`${randomUUID()}@example.invalid`}});
 const business=await db.business.create({data:{ownerId:user.id,name:"Audit laundry",slug:randomUUID(),businessType:"audit"}});
 try{
 const plan=await db.businessPlan.upsert({where:{code:"BUSINESS"},update:{},create:{code:"BUSINESS",name:"Business",monthlyPrice:100,productLimit:10}});
 await db.subscription.create({data:{businessId:business.id,planId:plan.id,provider:"internal",status:"active",startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+86400000)}});
 const connection=await db.whatsAppConnection.create({data:{businessId:business.id,provider:"meta",status:"connected",marketingEnabled:true,wabaId:randomUUID(),phoneNumberId:randomUUID(),credentialEnvelope:{}}});
 const template=await db.whatsAppTemplate.create({data:{businessId:business.id,connectionId:connection.id,providerTemplateId:randomUUID(),name:"infro_laundry_ready",language:"ar",category:"utility",status:"approved",providerStatus:"APPROVED",components:[{type:"BODY",text:LAUNDRY_READY_TEMPLATE_EXAMPLE}],rawPayload:{},lastSyncedAt:new Date()}});
 await db.whatsAppAutomation.create({data:{businessId:business.id,connectionId:connection.id,name:"Ready",status:"active",triggerType:"laundry_ready",triggerConfig:{version:1},actionConfig:{templateId:template.id},cooldownMinutes:0,createdByUserId:user.id}});
 let sequence=0;
 async function ticket(consent:boolean,status="ready"){
  const id=randomUUID();const number=++sequence;
  await db.$executeRaw`INSERT INTO "LaundryTicket" (id,"businessId",number,"requestId","customerName",phone,items,total,paid,status,"dueAt","createdBy","readyNotifyConsentAt") VALUES (${id},${business.id},${number},${randomUUID()},'Audit customer','+966500009940','[]'::jsonb,100,100,${status},now(),${user.id},${consent?new Date():null})`;
  return id;
 }
 const denied=await ticket(false);await db.$transaction(tx=>enqueueLaundryReady(tx,business.id,denied));
 const pending=await ticket(true,"processing");await db.$transaction(tx=>enqueueLaundryReady(tx,business.id,pending));
 assert.equal(await db.whatsAppAutomationEvent.count({where:{businessId:business.id}}),0);
 const ready=await ticket(true);
 assert.equal(await laundryReadyContext(db,randomUUID(),ready,"+966500009940"),null);
 assert.equal(await laundryReadyContext(db,business.id,ready,"+966500000000"),null);
 await db.$transaction(tx=>enqueueLaundryReady(tx,business.id,ready));await db.$transaction(tx=>enqueueLaundryReady(tx,business.id,ready));
 const event=await db.whatsAppAutomationEvent.findFirstOrThrow({where:{businessId:business.id}});
 assert.equal(await db.whatsAppAutomationEvent.count({where:{businessId:business.id}}),1);
 assert.equal(await db.whatsAppConsent.count({where:{businessId:business.id}}),0);
 await processWhatsAppAutomationEvent({eventId:event.id,workerId:"ready-audit",database:db});
 await processWhatsAppAutomationEvent({eventId:event.id,workerId:"ready-audit",database:db});
 assert.equal(await db.whatsAppAutomationJob.count({where:{businessId:business.id}}),1);
 const job=await db.whatsAppAutomationJob.findFirstOrThrow({where:{businessId:business.id}});
 assert.deepEqual(job.templateParameters,[{type:"body",parameters:[{type:"text",text:"Audit customer"},{type:"text",text:"Audit laundry"},{type:"text",text:String(sequence)}]}]);
 await db.$executeRaw`UPDATE "LaundryTicket" SET status='delivered' WHERE id=${ready}`;
 const result=await processNextWhatsAppAutomationDelivery({database:db,scope:{businessId:business.id,eventId:event.id},env:{...process.env,WHATSAPP_OUTBOUND_ENABLED:"true"},fetcher:async()=>{throw new Error("No provider request may occur in cancellation audit");}});
 assert.equal(result.result,"cancelled");
 assert.equal((await db.whatsAppAutomationJob.findUniqueOrThrow({where:{id:job.id}})).lastErrorCode,"LAUNDRY_READY_NO_LONGER_AUTHORIZED");
 await db.whatsAppContact.updateMany({where:{businessId:business.id},data:{optedOutAt:new Date()}});
 const optedOut=await ticket(true);await db.$transaction(tx=>enqueueLaundryReady(tx,business.id,optedOut));
 assert.equal(await db.whatsAppAutomationEvent.count({where:{businessId:business.id}}),1);
 console.log("laundry-ready: PASS consent, tenant isolation, deduplication, server parameters, no marketing opt-in, late delivery cancellation, opt-out");
 }finally{await db.business.update({where:{id:business.id},data:{deletedAt:new Date()}});await db.user.update({where:{id:user.id},data:{deletedAt:new Date()}});}
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
