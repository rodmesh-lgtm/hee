"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUserForWrites } from "../../lib/auth";
import { getDashboardBusinessForUser } from "../../lib/active-business";
import { db } from "../../lib/db";
import { hasActiveBusinessSubscription } from "../../lib/subscription-entitlement";
import { LAUNDRY_READY_TEMPLATE_NAME,laundryReadyTemplateSupported } from "../../lib/whatsapp/laundry-ready-domain";
export type NotificationState={error?:string;success?:string};
export async function saveLaundryNotifications(_:NotificationState,form:FormData):Promise<NotificationState>{
 const user=await getCurrentUserForWrites();const business=await getDashboardBusinessForUser(user.id);
 if(!business||business.ownerId!==user.id||form.get("businessId")!==business.id)return {error:"هذه الإعدادات متاحة لمالك المنشأة فقط."};
 const enabled=form.get("enabled")==="on";
 if(enabled&&!await hasActiveBusinessSubscription({businessId:business.id}))return {error:"يلزم اشتراك يتيح خدمة واتساب قبل التفعيل."};
 try{
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry-notifications:${business.id}`}))`;
  const existing=await tx.whatsAppAutomation.findFirst({where:{businessId:business.id,triggerType:"laundry_ready"}});
  if(enabled){
   const template=await tx.whatsAppTemplate.findFirst({where:{id:String(form.get("templateId")??""),businessId:business.id,provider:"meta",status:"approved",category:"utility",name:LAUNDRY_READY_TEMPLATE_NAME,connection:{businessId:business.id,provider:"meta",status:"connected",disabledAt:null,OR:[{marketingEnabled:true},{bookingEnabled:true}]}}});
   if(!template||!laundryReadyTemplateSupported(template.components,template.parameterFormat))throw new Error("TEMPLATE");
   if(existing&&existing.connectionId!==template.connectionId)throw new Error("CONNECTION");
   const data={status:"active",actionConfig:{templateId:template.id},activatedAt:new Date(),pausedAt:null};
   if(existing)await tx.whatsAppAutomation.update({where:{id:existing.id},data});
   else await tx.whatsAppAutomation.create({data:{...data,businessId:business.id,connectionId:template.connectionId,name:"جاهزية الطلب",triggerType:"laundry_ready",triggerConfig:{version:1},cooldownMinutes:0,createdByUserId:user.id}});
  }else if(existing)await tx.whatsAppAutomation.update({where:{id:existing.id},data:{status:"paused",pausedAt:new Date()}});
  // Pending notices never survive an owner configuration change. Claimed work is
  // independently checked by the delivery worker before contacting Meta.
  if(existing){
   await tx.whatsAppAutomationJob.updateMany({where:{businessId:business.id,automationId:existing.id,status:{in:["queued","retry_scheduled"]}},data:{status:"cancelled",lastErrorCode:"LAUNDRY_SETTINGS_CHANGED"}});
   await tx.whatsAppAutomationEvent.updateMany({where:{businessId:business.id,automationId:existing.id,status:"pending"},data:{status:"processed",processedAt:new Date()}});
  }
  await tx.whatsAppAuditLog.create({data:{businessId:business.id,actorUserId:user.id,action:"laundry.notifications.updated",targetType:"business",targetId:business.id,outcome:"success",metadata:{enabled}}});
 });
 revalidatePath("/Laundromat/Notifications");return {success:enabled?"تم تفعيل إشعار الجاهزية للطلبات التالية التي وافق أصحابها على الإشعار.":"تم إيقاف الإشعارات وإلغاء الرسائل التي لم تبدأ معالجتها."};
 }catch(error){return {error:error instanceof Error&&error.message==="CONNECTION"?"الإعداد الحالي مرتبط برقم آخر. استخدم قالبًا معتمدًا على الرقم نفسه.":"تعذر الحفظ. تأكد من اتصال الرقم واعتماد قالب جاهزية الطلب."};}
}
