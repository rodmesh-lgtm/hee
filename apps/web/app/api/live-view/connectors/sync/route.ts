import { db } from "../../../../lib/db";
import { livePrivateHeaders } from "../../../../lib/live-view/access";
import { connectorForRequest, connectorPlatformConfig } from "../../../../lib/live-view/connector-server";
import { openCameraCredentials } from "../../../../lib/live-view/credentials";
import { cameraRtspUrl } from "../../../../lib/live-view/camera-profiles";
import { publisherPassword } from "../../../../lib/live-view/connector-policy";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  const reply=(status:number,body:object)=>Response.json(body,{status,headers:livePrivateHeaders});
  try {
    const config=connectorPlatformConfig();if(!config)return reply(503,{error:"not_ready"});
    const connector=await connectorForRequest(request);if(!connector)return reply(401,{error:"unauthorized"});
    const stations=await db.liveViewStation.findMany({where:{businessId:connector.businessId,connectorId:connector.id,enabled:true,credentialEnvelope:{not:null}},take:100});
    const until=Date.now()+300_000;
    const cameras=stations.map(station=>{
      const credentials=openCameraCredentials(station.credentialEnvelope!,config.key,connector.businessId,station.id);
      const source=cameraRtspUrl({host:station.cameraHost!,port:station.cameraPort,path:station.cameraPath!,...credentials});
      const publish=`${config.publishOrigin}/${station.streamKey}?user=${encodeURIComponent(connector.id)}&pass=${publisherPassword(config.relaySecret,connector.id,station.streamKey,until)}`;
      return {id:station.id,version:station.configVersion,nonce:station.probeNonce,source,publish,publishExpiresAt:new Date(until).toISOString()};
    });
    // Re-read under the enrollment lock so a reset/revoke during config assembly
    // cannot release credentials to a previously authorized connector.
    const permitted=await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-connector:${connector.id}`}))`;
      const result=await tx.liveViewConnector.updateMany({where:{id:connector.id,tokenHash:connector.tokenHash,revokedAt:null,business:{deletedAt:null}},data:{lastSeenAt:new Date()}});
      return Boolean(result.count);
    });
    return permitted?reply(200,{pollSeconds:10,cameras}):reply(401,{error:"unauthorized"});
  }catch{return reply(503,{error:"configuration_unavailable"});}
}
