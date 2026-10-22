import "server-only";
import { db } from "../db";
import { liveTokenHash, validLiveToken } from "./policy";
import { liveGatewayConfig } from "./gateway";
import { validCameraKey } from "./credentials";
import { consumePublicWriteLimit } from "../rate-limit";

export function connectorPlatformConfig() {
  const gateway=liveGatewayConfig(); if(!gateway) return null;
  const key=process.env.LIVE_VIEW_CREDENTIAL_KEY || "";
  const relaySecret=process.env.LIVE_VIEW_RELAY_AUTH_SECRET || "";
  try {
    const publish=new URL(process.env.LIVE_VIEW_PUBLISH_ORIGIN || "");
    if(!validCameraKey(key) || relaySecret.length<32 || publish.protocol!=="rtmps:" || publish.username || publish.password || !["","/"].includes(publish.pathname) || publish.search || publish.hash) return null;
    return { ...gateway, key, relaySecret, publishOrigin:publish.toString().replace(/\/$/,"") };
  } catch { return null; }
}
export async function connectorForRequest(request: Request) {
  const token=request.headers.get("authorization")?.replace(/^Bearer /,"") || "";
  if(!validLiveToken(token)) return null;
  const connector=await db.liveViewConnector.findUnique({ where:{tokenHash:liveTokenHash(token)},include:{business:{select:{deletedAt:true}}} });
  if(!connector || connector.revokedAt || !connector.enrolledAt || connector.business.deletedAt) return null;
  const rate=await consumePublicWriteLimit({businessId:connector.businessId,scope:"live-connector-api",identity:connector.id,limit:100,windowSeconds:60});
  return rate.allowed ? connector : null;
}
export async function boundedJson(request: Request, max=16_384) {
  if(!request.body || Number(request.headers.get("content-length") || 0)>max) throw new Error("INVALID_BODY");
  const reader=request.body.getReader(); const chunks:Uint8Array[]=[]; let size=0;
  try { while(true) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new Error("INVALID_BODY");chunks.push(value); } }
  finally { await reader.cancel().catch(()=>undefined); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
