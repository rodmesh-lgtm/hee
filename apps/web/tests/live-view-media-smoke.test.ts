import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ffmpegArgs } from "../public/connectors/infro-live-connector.mjs";
const available=spawnSync("ffmpeg",["-version"],{stdio:"ignore"}).status===0&&spawnSync("ffprobe",["-version"],{stdio:"ignore"}).status===0;
test("actual connector media options remove audio while preserving H264 video",{skip:!available},async()=>{
  const dir=await mkdtemp(join(tmpdir(),"infro-media-"));
  try{
    const source=join(dir,"input.mp4"),out=join(dir,"output.flv");
    const created=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-f","lavfi","-i","testsrc2=size=160x120:rate=5","-f","lavfi","-i","sine=frequency=440","-t","1","-c:v","libx264","-c:a","aac",source],{encoding:"utf8",timeout:15_000});
    assert.equal(created.status,0,created.stderr);
    const inputProbe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_type","-of","json",source],{encoding:"utf8"});
    assert.ok(JSON.parse(inputProbe.stdout).streams.some((s:{codec_type:string})=>s.codec_type==="audio"));
    const camera={id:"s",version:1,nonce:"n",source:"rtsp://reader:test@192.168.1.1/live",publish:`rtmps://relay.example.test:1936/${"a".repeat(32)}`,publishExpiresAt:new Date(Date.now()+60_000).toISOString()};
    const args=ffmpegArgs(camera);
    // Substitute only the transport for a deterministic local fixture. All map,
    // codec, and audio/subtitle/data stripping options are the shipped agent's.
    for(const flag of ["-rtsp_transport","-rw_timeout","-tls_verify"]){const i=args.indexOf(flag);args.splice(i,2);}
    args[args.indexOf("-protocol_whitelist")+1]="file,crypto";
    args[args.indexOf("-i")+1]=source;args[args.length-1]=out;
    const processed=spawnSync("ffmpeg",args,{encoding:"utf8",timeout:15_000,stdio:["ignore","pipe","pipe","pipe"]});
    assert.equal(processed.status,0,processed.stderr);
    const probe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_name,codec_type","-of","json",out],{encoding:"utf8"});
    assert.equal(probe.status,0,probe.stderr);
    assert.deepEqual(JSON.parse(probe.stdout).streams,[{codec_name:"h264",codec_type:"video"}]);
  }finally{await rm(dir,{recursive:true,force:true});}
});
