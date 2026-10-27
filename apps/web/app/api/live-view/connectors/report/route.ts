import { db } from "../../../../lib/db";
import { livePrivateHeaders } from "../../../../lib/live-view/access";
import { boundedJson, ConnectorRequestError, connectorForRequest } from "../../../../lib/live-view/connector-server";
import { fetchLiveMedia, readBoundedMedia } from "../../../../lib/live-view/gateway";
import { rewriteLivePlaylist } from "../../../../lib/live-view/policy";
export const runtime="nodejs";
export async function POST(request:Request) {
  const reply=(status:number)=>new Response(null,{status,headers:livePrivateHeaders});
  try {
    const connector=await connectorForRequest(request);if(!connector)return reply(401);
    const body=await boundedJson(request,4096);
    if(typeof body.id!=="string"||!Number.isInteger(body.version)||typeof body.nonce!=="string"||!["probing","publishing","unreachable","unsupported_codec","unavailable","stopped"].includes(body.status))return reply(400);
    const station=await db.liveViewStation.findFirst({where:{id:body.id,businessId:connector.businessId,connectorId:connector.id,configVersion:body.version,probeNonce:body.nonce,enabled:true}});if(!station)return reply(409);
    let live=false;
    if(body.status==="publishing"){
      try{const response=await fetchLiveMedia(station.streamKey,"index.m3u8");if(response.ok){rewriteLivePlaylist((await readBoundedMedia(response,256_000)).toString("utf8"),"/check");live=true;}else await response.body?.cancel();}catch{/* Source may be starting; next heartbeat checks again. */}
    }
    // Identity/version/nonce are matched again after network I/O. Stale results
    // from a source that was edited or detached can never certify a new camera.
    await db.liveViewStation.updateMany({where:{id:station.id,businessId:connector.businessId,connectorId:connector.id,configVersion:body.version,probeNonce:body.nonce,enabled:true,connector:{tokenHash:connector.tokenHash,revokedAt:null}},data:{inputStatus:body.status,inputCheckedAt:new Date(),lastOnline:live,...(live?{lastCheckedAt:new Date()}:{})}});
    return reply(204);
  }catch(error){return reply(error instanceof ConnectorRequestError?error.status:503);}
}
