import assert from "node:assert/strict";
import { test } from "node:test";
import { cameraPath, cameraRtspUrl, connectorOnline, isPrivateCameraHost, validCameraPath } from "../app/lib/live-view/camera-profiles";
import { sealCameraCredentials, openCameraCredentials, validCameraKey } from "../app/lib/live-view/credentials";
import { publisherPassword, verifyPublisherPassword } from "../app/lib/live-view/connector-policy";
import { randomBytes } from "node:crypto";
import { ffmpegArgs, privateCameraHost, trustedPlatformOrigin, validAgentCamera, publisherNeedsRestart } from "../public/connectors/infro-live-connector.mjs";

test("vendor profiles encode NVR channel and substream without claiming model certification",()=>{
  assert.equal(cameraPath("hikvision",2,"sub"),"/Streaming/Channels/202");
  assert.equal(cameraPath("hikvision",1,"main"),"/Streaming/Channels/101");
  assert.equal(cameraPath("dahua",3,"sub"),"/cam/realmonitor?channel=3&subtype=1");
  assert.equal(cameraPath("axis",1,"sub"),"/axis-media/media.amp?videocodec=h264&audio=0&camera=1");
  assert.equal(cameraPath("reolink",2,"sub"),"/h264Preview_02_sub");
  assert.equal(cameraPath("custom",1,"main","/live/one?channel=1"),"/live/one?channel=1");
  assert.throws(()=>cameraPath("unknown",1,"sub"));assert.throws(()=>cameraPath("dahua",0,"sub"));
  assert.throws(()=>cameraPath("hikvision",2,"archive"));
});
test("cloud and connector agree on private canonical LAN addresses only",()=>{
  for(const host of ["10.0.0.1","172.16.0.1","172.31.255.1","192.168.1.110"]){assert.equal(isPrivateCameraHost(host),true);assert.equal(privateCameraHost(host),true);}
  for(const host of ["127.0.0.1","169.254.169.254","0.0.0.0","localhost","camera.local","8.8.8.8","172.32.0.1","172.15.0.1","192.168.01.1","::1","::ffff:192.168.1.1","0x7f000001","192.168.256.1","2130706433"]){assert.equal(isPrivateCameraHost(host),false,host);assert.equal(privateCameraHost(host),false,host);}
});
test("manual paths reject URLs, embedded secrets, traversal and control characters",()=>{
  for(const path of ["//evil/live","https://evil/live","/../secret","/live\n-a x","/live#fragment","/foo%2fbar","/foo?password=secret","/foo?token=secret"]){assert.equal(validCameraPath(path),false,path);}
  const uri=cameraRtspUrl({host:"192.168.1.10",port:554,path:"/live",username:"reader@camera",password:" a:@/?#pass "});
  assert.ok(uri.includes("reader%40camera:%20a%3A%40%2F%3F%23pass%20@192.168.1.10"));
  assert.throws(()=>cameraRtspUrl({host:"127.0.0.1",port:554,path:"/live",username:"u",password:"p"}));
});
test("encrypted camera passwords are bound to their business and station",()=>{
  const key=randomBytes(32).toString("base64"),value={username:"reader",password:" do-not-trim "};
  const a=sealCameraCredentials(value,key,"business-a","station-a"),b=sealCameraCredentials(value,key,"business-a","station-a");
  assert.notEqual(a,b);assert.ok(!a.includes(value.password));assert.deepEqual(openCameraCredentials(a,key,"business-a","station-a"),value);
  assert.throws(()=>openCameraCredentials(a,key,"business-b","station-a"));
  assert.throws(()=>openCameraCredentials(a,key,"business-a","station-b"));
  assert.throws(()=>openCameraCredentials(a,randomBytes(32).toString("base64"),"business-a","station-a"));
  const bytes=Buffer.from(a,"base64url");bytes[28]^=1;assert.throws(()=>openCameraCredentials(bytes.toString("base64url"),key,"business-a","station-a"));
  assert.equal(validCameraKey("short"),false);
});
test("publish credentials expire and are scoped to connector plus stream path",()=>{
  const secret="a".repeat(32),now=Date.now(),until=now+299_000;
  const pass=publisherPassword(secret,"connector-a","stream-a",until);
  assert.equal(verifyPublisherPassword(secret,"connector-a","stream-a",pass,now)?.getTime(),until);
  assert.equal(verifyPublisherPassword(secret,"connector-b","stream-a",pass,now),null);
  assert.equal(verifyPublisherPassword(secret,"connector-a","stream-b",pass,now),null);
  assert.equal(verifyPublisherPassword(secret,"connector-a","stream-a",pass,until),null);
  assert.equal(verifyPublisherPassword(secret,"connector-a","stream-a",pass,now-5000),null);
});
test("offline, revoked and unpaired connectors cannot grant viewing",()=>{
  const now=Date.now(),online={revokedAt:null,enrolledAt:new Date(now-100),lastSeenAt:new Date(now-100)};
  assert.equal(connectorOnline(online,now),true);
  assert.equal(connectorOnline({...online,revokedAt:new Date()},now),false);
  assert.equal(connectorOnline({...online,enrolledAt:null},now),false);
  assert.equal(connectorOnline({...online,lastSeenAt:new Date(now-45_000)},now),false);
});
test("connector strips audio and never executes camera text through a shell",()=>{
  const camera={id:"station-a",version:1,nonce:"nonce",source:"rtsp://reader:p%3B%24%28id%29@192.168.1.10:554/live",publish:`rtmps://relay.example.test:1936/${"a".repeat(32)}?user=u&pass=p`,publishExpiresAt:new Date(Date.now()+60_000).toISOString()};
  assert.equal(validAgentCamera(camera),true);
  const args=ffmpegArgs(camera);assert.ok(args.includes("-an"));assert.ok(args.includes("-sn"));assert.ok(args.includes("-dn"));assert.equal(args[args.indexOf("-tls_verify")+1],"1");assert.equal(args[args.indexOf("-i")+1],camera.source);
  assert.equal(validAgentCamera({...camera,source:"file:///etc/passwd"}),false);
  assert.equal(validAgentCamera({...camera,source:"rtsp://r:p@169.254.169.254/live"}),false);
  assert.equal(validAgentCamera({...camera,publish:camera.publish.replace("rtmps:","rtmp:")}),false);
  assert.equal(trustedPlatformOrigin("https://ir.sa"),"https://ir.sa");
  assert.throws(()=>trustedPlatformOrigin("http://ir.sa"));assert.throws(()=>trustedPlatformOrigin("https://other.example.test"));
  assert.equal(publisherNeedsRestart(0,239_999),false);assert.equal(publisherNeedsRestart(0,240_000),true);
});
