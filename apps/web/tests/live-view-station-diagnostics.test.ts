import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import * as profiles from "../app/lib/live-view/camera-profiles";

test("station checks identify missing source configuration instead of blaming the gateway",async()=>{
 const now=new Date();
 let station={id:"station",businessId:"business",connectorId:null as string|null,connector:null as null|{revokedAt:null;enrolledAt:Date;lastSeenAt:Date},cameraHost:null as string|null,credentialEnvelope:null as string|null,configVersion:1,streamKey:"a".repeat(32),inputCheckedAt:now,inputStatus:"pending"};
 const dependencies:Record<string,unknown>={
  "../lib/commercial-access":{},"../lib/live-view/whatsapp-domain":{},"./live-view-whatsapp":{},"../lib/live-view/readiness":{},
  "../lib/live-view/camera-profiles":profiles,"node:crypto":{},"next/cache":{revalidatePath:()=>{}},
  "../lib/auth":{getCurrentUserForWrites:async()=>({id:"owner",emailVerifiedAt:now})},
  "../lib/active-business":{getActiveBusinessForUser:async()=>({id:"business"})},"../lib/rate-limit":{consumePublicWriteLimit:async()=>({allowed:true})},
  "../lib/db":{db:{liveViewStation:{findFirst:async(a:{where:{businessId:string}})=>{assert.equal(a.where.businessId,"business");return station;},updateMany:async()=>({count:1})}}},
  "../lib/live-view/gateway":{liveGatewayConfig:()=>({}),fetchLiveMedia:async()=>new Response(null,{status:404})},"../lib/live-view/policy":{}
 };
 const source=await readFile(new URL("../app/actions/live-view.ts",import.meta.url),"utf8");
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:{checkLiveStationAction?:(s:object,f:FormData)=>Promise<{error?:string}>}={};
 runInNewContext(compiled,{exports,require:(id:string)=>{assert.ok(id in dependencies,id);return dependencies[id];},Date});
 const form=new FormData();form.set("stationId","station");assert.ok(exports.checkLiveStationAction);
 assert.match((await exports.checkLiveStationAction({},form)).error||"",/غير مرتبطة بموصل/);
 station={...station,connectorId:"connector",connector:{revokedAt:null,enrolledAt:now,lastSeenAt:now}};
 assert.match((await exports.checkLiveStationAction({},form)).error||"",/مصدر الكاميرا غير مكتمل/);
 station={...station,cameraHost:"192.168.8.44",credentialEnvelope:"encrypted-fixture",inputStatus:"unsupported_codec"};
 assert.match((await exports.checkLiveStationAction({},form)).error||"",/H\.264/);
 station={...station,inputStatus:"publishing"};
 assert.match((await exports.checkLiveStationAction({},form)).error||"",/خادم البث لم يؤكد/);
 station={...station,inputStatus:"unreachable"};
 assert.match((await exports.checkLiveStationAction({},form)).error||"",/قراءة القناة محليًا/);
});
