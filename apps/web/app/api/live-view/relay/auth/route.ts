import { commercialAccess } from "../../../../lib/commercial-access";
import { db } from "../../../../lib/db";
import { boundedJson, connectorPlatformConfig } from "../../../../lib/live-view/connector-server";
import { livePrivateHeaders } from "../../../../lib/live-view/access";
import { safeEqualSecret, verifyPublisherPassword } from "../../../../lib/live-view/connector-policy";
import { connectorOnline } from "../../../../lib/live-view/camera-profiles";
export const runtime="nodejs";
export async function POST(request:Request) {
  const deny=()=>new Response(null,{status:401,headers:livePrivateHeaders});
  try{
    const config=connectorPlatformConfig();if(!config||!safeEqualSecret(config.relaySecret,request.headers.get("x-infro-relay-secret")||""))return deny();
    const body=await boundedJson(request,4096);
    if(typeof body.path!=="string"||!/^[a-f0-9]{32}$/.test(body.path))return deny();
    // HLS is not publicly exposed by the relay guard. Only the INFRO gateway
    // bearer reaches it; this second scoped credential prevents an auth bypass
    // if the media service is accidentally made reachable.
    if(body.action==="read"&&body.protocol==="hls"&&body.user==="infro-reader"&&safeEqualSecret(config.secret,String(body.password||"")))return new Response(null,{status:204,headers:livePrivateHeaders});
    if(body.action!=="publish"||body.protocol!=="rtmp"||typeof body.user!=="string"||typeof body.password!=="string")return deny();
    const expires=verifyPublisherPassword(config.relaySecret,body.user,body.path,body.password);if(!expires)return deny();
    const station=await db.liveViewStation.findFirst({where:{streamKey:body.path,connectorId:body.user,enabled:true,credentialEnvelope:{not:null},business:{deletedAt:null}},include:{connector:true}});
    if(!station?.connector||!connectorOnline(station.connector))return deny();
    if(!(await commercialAccess(station.businessId)).liveView)return deny();
    // MediaMTX v1.21.2 closes the publishing connection at this expiration.
    return Response.json({expireAt:expires.toISOString()},{headers:livePrivateHeaders});
  }catch{return deny();}
}
