import assert from "node:assert/strict";
import {test} from "node:test";
import {connectorStateDirectory,connectorStatus} from "../public/connectors/infro-live-connector.mjs";
test("service state directory is explicit and absolute; legacy location preserved",()=>{
  assert.equal(connectorStateDirectory([],"/legacy"),"/legacy");
  assert.equal(connectorStateDirectory(["--run","--state-directory","/service/state"],"/legacy"),"/service/state");
  for(const args of [["--state-directory"],["--state-directory","relative"],["--state-directory","/foo\nbar"]])assert.throws(()=>connectorStateDirectory(args,"/legacy"));
});
test("local diagnostics expose bounded fixed statuses and no source credentials",()=>{
  const cameras=Array.from({length:25},(_,i)=>({id:`private-${i}`,status:i%2?"publishing":"rtsp://reader:password@192.168.8.44/live",source:"rtsp://reader:password@192.168.8.44/live",publish:"rtmps://relay?token=secret"}));
  const result=connectorStatus("connected",cameras,new Date("2026-10-27T00:00:00Z"));
  assert.equal(result.cameras.length,16);assert.equal(result.cameras[0].status,"unavailable");assert.equal(result.cameras[1].status,"publishing");
  const raw=JSON.stringify(result);for(const secret of ["password","reader","private-","192.168","token","secret","rtsp"])assert.equal(raw.includes(secret),false);
  assert.equal(result.updatedAt,"2026-10-27T00:00:00.000Z");
});
