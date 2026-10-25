"use server";
import { commercialAccess } from "../lib/commercial-access";
import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { LIVE_ACTIVITIES, CAMERA_BRANDS, cameraPath, cameraRtspUrl } from "../lib/live-view/camera-profiles";
import { sealCameraCredentials, openCameraCredentials } from "../lib/live-view/credentials";
import { connectorPlatformConfig } from "../lib/live-view/connector-server";
import { newLiveToken, LIVE_VIEW_COOLDOWN_MS } from "../lib/live-view/policy";
export type CameraSetupState={error?:string;success?:string;pairingCode?:string};
const text=(form:FormData,key:string)=>String(form.get(key)??"").trim();
async function owner() {
  const user=await getCurrentUserForWrites();const business=await getActiveBusinessForUser(user.id);
  if(!business || !user.emailVerifiedAt || !(await commercialAccess(business.id)).liveView)return null;
  const rate=await consumePublicWriteLimit({scope:"live-view-setup",businessId:business.id,identity:user.id,limit:30,windowSeconds:60});
  return rate.allowed?{user,business}:null;
}
function refresh(){revalidatePath("/dashboard/live-view");revalidatePath("/dashboard/live-view/setup");}
export async function addLiveConnectorAction(_:CameraSetupState,form:FormData):Promise<CameraSetupState> {
  const who=await owner();if(!who)return {error:"إعداد الكاميرات متاح للمالك بعد التحقق من البريد، مع حد للمحاولات."};
  const name=text(form,"name"),activity=text(form,"activity");
  if(name.length<2||name.length>100||!Object.hasOwn(LIVE_ACTIVITIES,activity))return {error:"أدخل اسم الموقع واختر النشاط."};
  if(!connectorPlatformConfig())return {error:"إعداد الربط الذاتي غير متاح بعد. يلزم تهيئة بوابة البث من إدارة INFRO."};
  const pair=newLiveToken();
  try {
    await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view-setup:${who.business.id}`}))`;
      if(await tx.liveViewConnector.count({where:{businessId:who.business.id}})>=20)throw new Error("LIMIT");
      const row=await tx.liveViewConnector.create({data:{businessId:who.business.id,name,activity,pairingHash:pair.hash,pairingExpiresAt:new Date(Date.now()+600_000)}});
      await tx.whatsAppAuditLog.create({data:{businessId:who.business.id,actorUserId:who.user.id,action:"live-view.connector.created",targetType:"live-view-connector",targetId:row.id,outcome:"success"}});
    });refresh();return {success:"أُضيف الموقع. شغّل موصل INFRO على جهاز داخل الموقع وأدخل رمز الاقتران خلال 10 دقائق.",pairingCode:pair.token};
  }catch{return {error:"تعذرت إضافة موقع الربط. الحد الحالي 20 موقعًا لكل منشأة."};}
}
export async function pairLiveConnectorAction(_:CameraSetupState,form:FormData):Promise<CameraSetupState> {
  const who=await owner();if(!who)return {error:"غير مصرح أو محاولات كثيرة."};
  if(!connectorPlatformConfig())return {error:"بوابة الربط الذاتي غير جاهزة."};
  const id=text(form,"connectorId"),pair=newLiveToken();
  try {await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-connector:${id}`}))`;
    const row=await tx.liveViewConnector.findFirst({where:{id,businessId:who.business.id}});if(!row)throw new Error("NOT_FOUND");
    await tx.liveViewConnector.update({where:{id},data:{pairingHash:pair.hash,pairingExpiresAt:new Date(Date.now()+600_000),tokenHash:null,enrolledAt:null,lastSeenAt:null,revokedAt:null}});
    const stations=await tx.liveViewStation.findMany({where:{connectorId:id,businessId:who.business.id},select:{id:true}});
    // Same ordering as station actions, avoiding a connector/station deadlock.
    for(const station of stations.sort((a,b)=>a.id.localeCompare(b.id))) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view:${station.id}`}))`;
      await tx.liveViewStation.update({where:{id:station.id},data:{lastOnline:false,lastCheckedAt:null,inputStatus:"pending",streamKey:randomBytes(16).toString("hex"),configVersion:{increment:1},reuseAfterAt:new Date(Date.now()+LIVE_VIEW_COOLDOWN_MS)}});
      await tx.liveViewSession.updateMany({where:{stationId:station.id,businessId:who.business.id,endedAt:null},data:{endedAt:new Date()}});
    }
    await tx.whatsAppAuditLog.create({data:{businessId:who.business.id,actorUserId:who.user.id,action:"live-view.connector.pairing-reset",targetType:"live-view-connector",targetId:id,outcome:"success"}});
  });refresh();return {success:"أُبطل اتصال الجهاز السابق وروابط المشاهدة المرتبطة به. استخدم الرمز الجديد خلال 10 دقائق.",pairingCode:pair.token};}catch{return {error:"تعذر إصدار رمز اقتران."};}
}
export async function revokeLiveConnectorAction(_:CameraSetupState,form:FormData):Promise<CameraSetupState> {
  const who=await owner();if(!who)return {error:"غير مصرح أو محاولات كثيرة."};const id=text(form,"connectorId");
  try{await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-connector:${id}`}))`;
    const changed=await tx.liveViewConnector.updateMany({where:{id,businessId:who.business.id},data:{revokedAt:new Date(),tokenHash:null,pairingHash:null,pairingExpiresAt:null}});if(!changed.count)throw new Error("NOT_FOUND");
    const stations=await tx.liveViewStation.findMany({where:{connectorId:id,businessId:who.business.id},select:{id:true}});
    for(const station of stations.sort((a,b)=>a.id.localeCompare(b.id))) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view:${station.id}`}))`;
      await tx.liveViewStation.update({where:{id:station.id},data:{lastOnline:false,lastCheckedAt:null,inputStatus:"stopped",streamKey:randomBytes(16).toString("hex"),configVersion:{increment:1},reuseAfterAt:new Date(Date.now()+LIVE_VIEW_COOLDOWN_MS)}});
      await tx.liveViewSession.updateMany({where:{stationId:station.id,businessId:who.business.id,endedAt:null},data:{endedAt:new Date()}});
    }
    await tx.whatsAppAuditLog.create({data:{businessId:who.business.id,actorUserId:who.user.id,action:"live-view.connector.revoked",targetType:"live-view-connector",targetId:id,outcome:"success"}});
  });refresh();return {success:"فُصل جهاز الربط وأُبطلت روابط الجلسات التابعة له."};}catch{return {error:"تعذر فصل الجهاز."};}
}
export async function saveLiveCameraAction(_:CameraSetupState,form:FormData):Promise<CameraSetupState> {
  const who=await owner();if(!who)return {error:"إعداد الكاميرات متاح للمالك فقط."};
  const config=connectorPlatformConfig();if(!config)return {error:"بوابة البث والربط الذاتي لم تُجهزا بعد."};
  const stationId=text(form,"stationId")||randomUUID(),connectorId=text(form,"connectorId"),name=text(form,"name"),brand=text(form,"brand"),model=text(form,"model"),deviceType=text(form,"deviceType"),host=text(form,"host"),port=Number(text(form,"port")),channel=Number(text(form,"channel")),profile=text(form,"profile"),username=text(form,"username");
  // Passwords are opaque; do not trim or redisplay them in action responses.
  const password=String(form.get("password")??"");const custom=text(form,"path");
  if(name.length<2||name.length>80||model.length<1||model.length>100||!Object.hasOwn(CAMERA_BRANDS,brand)||!["camera","recorder"].includes(deviceType)||form.get("authorized")!=="on")return {error:"أكمل بيانات الكاميرا وأكد أنك مخول لربطها."};
  try{
    const path=cameraPath(brand,channel,profile,custom);
    await db.$transaction(async tx=>{
      // Lock connector first; pair/reset/revoke use the same lock order.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-connector:${connectorId}`}))`;
      const connector=await tx.liveViewConnector.findFirst({where:{id:connectorId,businessId:who.business.id,revokedAt:null}});if(!connector)throw new Error("CONNECTOR");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view:${stationId}`}))`;
      const existing=await tx.liveViewStation.findFirst({where:{id:stationId,businessId:who.business.id}});
      if(text(form,"stationId")&&!existing)throw new Error("STATION");
      if(existing&&await tx.liveViewSession.count({where:{stationId,businessId:who.business.id,endedAt:null,expiresAt:{gt:new Date()}}}))throw new Error("ACTIVE");
      if((!existing||existing.connectorId!==connectorId)&&await tx.liveViewStation.count({where:{connectorId,businessId:who.business.id}})>=16)throw new Error("CONNECTOR_LIMIT");
      let credentials={username,password};
      if(!password&&existing?.credentialEnvelope){const previous=openCameraCredentials(existing.credentialEnvelope,config.key,who.business.id,stationId);credentials={username,password:previous.password};}
      cameraRtspUrl({host,port,path,...credentials}); // Validate without making a cloud-to-LAN fetch.
      const data={connectorId,name,location:connector.name,kind:LIVE_ACTIVITIES[connector.activity as keyof typeof LIVE_ACTIVITIES]?.kind??"area",cameraBrand:brand,cameraModel:model,deviceType,cameraHost:host,cameraPort:port,cameraChannel:channel,cameraProfile:profile,cameraPath:path,credentialEnvelope:sealCameraCredentials(credentials,config.key,who.business.id,stationId),streamKey:randomBytes(16).toString("hex"),lastOnline:false,lastCheckedAt:null,inputStatus:"pending",inputCheckedAt:null,probeNonce:randomBytes(16).toString("hex"),reuseAfterAt:new Date(Date.now()+LIVE_VIEW_COOLDOWN_MS)};
      if(existing) {
        await tx.liveViewStation.update({where:{id:stationId},data:{...data,configVersion:{increment:1}}});
        await tx.liveViewSession.updateMany({where:{stationId,businessId:who.business.id,endedAt:null},data:{endedAt:new Date()}});
      }else{
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view-business:${who.business.id}`}))`;
        if(await tx.liveViewStation.count({where:{businessId:who.business.id}})>=(await commercialAccess(who.business.id,tx)).liveCameraLimit)throw new Error("LIMIT");
        await tx.liveViewStation.create({data:{id:stationId,businessId:who.business.id,...data}});
      }
      await tx.whatsAppAuditLog.create({data:{businessId:who.business.id,actorUserId:who.user.id,action:"live-view.camera.configured",targetType:"live-view-station",targetId:stationId,outcome:"success"}});
    });refresh();return {success:"حُفظت بيانات الكاميرا مشفرة. سيفحص جهاز الربط المصدر ويبدأ البث؛ تابع الحالة هنا."};
  }catch(error){return {error:error instanceof Error&&error.message==="ACTIVE"?"أنه جلسة العميل الحالية قبل تغيير مصدر الكاميرا.":"تعذر حفظ الإعدادات. تحقق من عنوان الشبكة المحلية والمنفذ والمسار وبيانات الدخول وموقع الربط."};}
}
export async function probeLiveCameraAction(_:CameraSetupState,form:FormData):Promise<CameraSetupState> {
  const who=await owner();if(!who)return {error:"غير مصرح أو محاولات كثيرة."};
  const changed=await db.liveViewStation.updateMany({where:{id:text(form,"stationId"),businessId:who.business.id,connectorId:{not:null},credentialEnvelope:{not:null}},data:{probeNonce:randomBytes(16).toString("hex"),inputStatus:"pending"}});
  if(!changed.count)return {error:"أكمل بيانات الكاميرا أولًا."};refresh();return {success:"أُرسل طلب الفحص إلى جهاز الموقع. ستظهر النتيجة عند اتصاله."};
}
export async function disconnectLiveCameraAction(_:CameraSetupState,form:FormData):Promise<CameraSetupState> {
  const who=await owner();if(!who)return {error:"غير مصرح أو محاولات كثيرة."};const id=text(form,"stationId");
  try {await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view:${id}`}))`;
    const changed=await tx.liveViewStation.updateMany({where:{id,businessId:who.business.id},data:{credentialEnvelope:null,connectorId:null,cameraHost:null,cameraPath:null,lastOnline:false,lastCheckedAt:null,inputStatus:"unconfigured",enabled:false,streamKey:randomBytes(16).toString("hex"),configVersion:{increment:1},reuseAfterAt:new Date(Date.now()+LIVE_VIEW_COOLDOWN_MS)}});
    if(!changed.count)throw new Error("NOT_FOUND");
    await tx.liveViewSession.updateMany({where:{stationId:id,businessId:who.business.id,endedAt:null},data:{endedAt:new Date()}});
    await tx.whatsAppAuditLog.create({data:{businessId:who.business.id,actorUserId:who.user.id,action:"live-view.camera.disconnected",targetType:"live-view-station",targetId:id,outcome:"success"}});
  });refresh();return {success:"فُصلت الكاميرا وحُذفت بيانات دخولها وأُبطلت جلساتها."};}catch{return {error:"تعذر فصل الكاميرا."};}
}
