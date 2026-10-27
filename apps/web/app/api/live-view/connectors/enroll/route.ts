import { db } from "../../../../lib/db";
import { livePrivateHeaders } from "../../../../lib/live-view/access";
import { boundedJson, connectorPlatformConfig } from "../../../../lib/live-view/connector-server";
import { liveTokenHash, newLiveToken, validLiveToken } from "../../../../lib/live-view/policy";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../lib/rate-limit";
export const runtime="nodejs";
export async function POST(request:Request) {
  const reply=(status:number,body:object)=>Response.json(body,{status,headers:livePrivateHeaders});
  try {
    if(!connectorPlatformConfig())return reply(503,{error:"not_ready"});
    const rate=await consumePublicWriteLimit({businessId:"live-enrollment",scope:"live-enrollment",identity:requestClientAddress(request),limit:15,windowSeconds:600});
    if(!rate.allowed)return reply(429,{error:"try_later"});
    const body=await boundedJson(request,2048);if(typeof body.code!=="string"||!validLiveToken(body.code))return reply(400,{error:"invalid_code"});
    const token=newLiveToken(),digest=liveTokenHash(body.code);
    const paired=await db.$transaction(async tx=>{
      const found=await tx.liveViewConnector.findUnique({where:{pairingHash:digest},select:{id:true,businessId:true}});if(!found)return false;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-connector:${found.id}`}))`;
      if(!await tx.business.findFirst({where:{id:found.businessId,deletedAt:null}}))return false;
      const changed=await tx.liveViewConnector.updateMany({where:{id:found.id,pairingHash:digest,pairingExpiresAt:{gt:new Date()},revokedAt:null,tokenHash:null},data:{tokenHash:token.hash,pairingHash:null,pairingExpiresAt:null,enrolledAt:new Date(),lastSeenAt:new Date(),agentVersion:"1"}});
      if(changed.count)await tx.whatsAppAuditLog.create({data:{businessId:found.businessId,actorType:"system",action:"live-view.connector.enrolled",targetType:"live-view-connector",targetId:found.id,outcome:"success"}});
      return Boolean(changed.count);
    });
    return paired?reply(200,{token:token.token}):reply(410,{error:"invalid_or_expired_code"});
  }catch{return reply(503,{error:"enrollment_failed"});}
}
