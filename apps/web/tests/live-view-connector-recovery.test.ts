import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import * as policy from "../app/lib/live-view/policy";

async function loadModule(file:string,dependencies:Record<string,unknown>) {
 const source=await readFile(new URL(file,import.meta.url),"utf8");
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:Record<string,unknown>={};
 runInNewContext(compiled,{exports,require:(id:string)=>{assert.ok(id in dependencies,id);return dependencies[id];},Response,Date,Error,URL,Buffer});
 return exports;
}
test("connector sync distinguishes revoked credentials, disabled service and throttling",async()=>{
 let enabled=true,allowed=true,revoked=false;
 let cameraReads=0;
 const record={id:"connector-a",businessId:"business-a",enrolledAt:new Date(),revokedAt:null,tokenHash:"digest",business:{deletedAt:null}};
 const db={liveViewConnector:{findUnique:async()=>revoked?{...record,revokedAt:new Date()}:record},liveViewStation:{findMany:async()=>{cameraReads++;throw Error("should not read camera credentials");}}};
 const helper=await loadModule("../app/lib/live-view/connector-server.ts",{
  "server-only":{},"../commercial-access":{commercialAccess:async()=>({liveView:enabled})},"../db":{db},"./policy":policy,
  "./gateway":{liveGatewayConfig:()=>null},"./credentials":{validCameraKey:()=>false},"../rate-limit":{consumePublicWriteLimit:async()=>({allowed})}
 });
 const route=await loadModule("../app/api/live-view/connectors/sync/route.ts",{
  "../../../../lib/db":{db},"../../../../lib/live-view/access":{livePrivateHeaders:{"Cache-Control":"private, no-store"}},
  "../../../../lib/live-view/connector-server":{...helper,connectorPlatformConfig:()=>({})},
  "../../../../lib/live-view/credentials":{openCameraCredentials:()=>{throw Error("no secrets on rejection");}},
  "../../../../lib/live-view/camera-profiles":{cameraRtspUrl:()=>""},"../../../../lib/live-view/connector-policy":{publisherPassword:()=>""}
 });
 const GET=route.GET as (r:Request)=>Promise<Response>;
 const request=(token="A".repeat(43))=>new Request("https://ir.sa/api/live-view/connectors/sync",{headers:{Authorization:`Bearer ${token}`}});
 assert.equal((await GET(request("bad"))).status,401);
 revoked=true;assert.equal((await GET(request())).status,401);revoked=false;
 enabled=false;const disabled=await GET(request());assert.equal(disabled.status,403);assert.deepEqual(await disabled.json(),{error:"access_required"});enabled=true;
 allowed=false;const limited=await GET(request());assert.equal(limited.status,429);assert.deepEqual(await limited.json(),{error:"try_later"});allowed=true;
 assert.equal(cameraReads,0);
 const connectorForRequest=helper.connectorForRequest as (r:Request)=>Promise<typeof record>;
 assert.equal((await connectorForRequest(request())).id,"connector-a");
});
