#!/usr/bin/env node
/** INFRO Live connector v1 — Node 20+, ffmpeg and ffprobe. No shell execution. */
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rename, chmod } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join, isAbsolute } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

export function privateCameraHost(host) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const parts=host.split("."),p=parts.map(Number);
  if(p.some((n,i)=>n>255||String(n)!==parts[i]))return false;
  return p[0]===10||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168);
}
export function validAgentCamera(camera) {
  try {
    const source=new URL(camera.source),publish=new URL(camera.publish);
    return typeof camera.id==="string" && Number.isInteger(camera.version) && typeof camera.nonce==="string" && source.protocol==="rtsp:" && privateCameraHost(source.hostname) && Boolean(source.username&&source.password) && publish.protocol==="rtmps:" && !publish.username && !publish.password && /^[a-f0-9]{32}$/.test(publish.pathname.slice(1)) && Date.parse(camera.publishExpiresAt)>Date.now();
  }catch{return false;}
}
export function ffmpegArgs(camera) {
  if(!validAgentCamera(camera))throw new Error("INVALID_CAMERA_CONFIGURATION");
  return ["-hide_banner","-loglevel","error","-nostdin","-protocol_whitelist","rtsp,tcp,udp,rtp,crypto","-rtsp_transport","tcp","-rw_timeout","10000000","-i",camera.source,"-map","0:v:0","-an","-sn","-dn","-c:v","copy","-f","flv","-tls_verify","1","-progress","pipe:3",camera.publish];
}
export function trustedPlatformOrigin(raw) {
  const u=new URL(raw);
  if(u.protocol!=="https:"||u.username||u.password||u.pathname!=="/"||u.search||u.hash||!(u.hostname==="ir.sa"||u.hostname==="hub.ir.sa"||/^[a-z0-9-]+\.vercel\.app$/.test(u.hostname)))throw new Error("UNTRUSTED_PLATFORM");
  return u.origin;
}
export function publisherNeedsRestart(startedAt,now=Date.now()) {return now-startedAt>=240_000;}
let ffmpegBinary="ffmpeg",ffprobeBinary="ffprobe";
export function connectorStateDirectory(args, fallback=join(homedir(),".infro-live")) {
  const index=args.indexOf("--state-directory");
  if(index===-1)return fallback;
  const directory=args[index+1];
  if(!directory||!isAbsolute(directory)||/[\r\n\0]/.test(directory))throw new Error("INVALID_STATE_DIRECTORY");
  return directory;
}
export function connectorStatus(state,cameras=[],now=new Date()) {
  const allowed=new Set(["probing","publishing","unreachable","unavailable","unsupported_codec"]);
  return {version:1,state,updatedAt:now.toISOString(),cameras:cameras.slice(0,16).map(c=>({status:allowed.has(c.status)?c.status:"unavailable"}))};
}
async function dependency(binary) {
  return new Promise(resolve=>{const p=spawn(binary,["-version"],{stdio:"ignore",shell:false});p.on("error",()=>resolve(false));p.on("close",code=>resolve(code===0));});
}
async function probe(camera) {
  return new Promise(resolve=>{
    let output="",finished=false;
    const proc=spawn(ffprobeBinary,["-v","error","-protocol_whitelist","rtsp,tcp,udp,rtp,crypto","-rtsp_transport","tcp","-rw_timeout","8000000","-i",camera.source,"-select_streams","v:0","-show_entries","stream=codec_name","-of","json"],{stdio:["ignore","pipe","ignore"],shell:false});
    const finish=status=>{if(finished)return;finished=true;clearTimeout(timer);proc.kill("SIGKILL");resolve(status);};
    const timer=setTimeout(()=>finish("unreachable"),10_000);
    proc.stdout.on("data",chunk=>{output+=chunk.toString();if(output.length>64000)finish("unavailable");});
    proc.on("error",()=>finish("unavailable"));
    proc.on("close",code=>{if(code!==0)return finish("unreachable");try{const codec=JSON.parse(output).streams?.[0]?.codec_name;finish(codec==="h264"?"ready":codec?"unsupported_codec":"unavailable");}catch{finish("unavailable");}});
  });
}
async function enroll(statePath) {
  const prompt=createInterface({input:process.stdin,output:process.stdout});
  try{
    const raw=(await prompt.question("INFRO platform origin [https://ir.sa]: ")).trim()||"https://ir.sa";
    const origin=trustedPlatformOrigin(raw),code=(await prompt.question("One-use pairing code from your INFRO account: ")).trim();
    if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw new Error("INVALID_PAIRING_CODE");
    const result=await fetch(`${origin}/api/live-view/connectors/enroll`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code}),redirect:"error",signal:AbortSignal.timeout(15_000)});
    if(!result.ok)throw new Error("PAIRING_FAILED_GENERATE_NEW_CODE");
    const data=await result.json();if(!/^[A-Za-z0-9_-]{43}$/.test(data.token))throw new Error("INVALID_ENROLLMENT");
    const state={origin,token:data.token};
    const temp=`${statePath}.tmp`;
    await writeFile(temp,JSON.stringify(state),{mode:0o600,flag:"wx"});await rename(temp,statePath);await chmod(statePath,0o600);
    return state;
  }finally{prompt.close();}
}
export function startupFailureCode(error) {
  const allowed=new Set(["NODE_20_REQUIRED","INVALID_MEDIA_DIRECTORY","INSTALL_FFMPEG_AND_FFPROBE_FIRST","INVALID_STATE_DIRECTORY","INVALID_STATE_USE_PAIR","PAIR_INTERACTIVELY_FIRST"]);
  if(allowed.has(error?.message))return error.message;
  if(error?.code==="EACCES"||error?.code==="EPERM")return "STATE_ACCESS_DENIED";
  return "STARTUP_FAILED";
}
export async function main() {
  if(Number(process.versions.node.split(".")[0])<20)throw new Error("NODE_20_REQUIRED");
  const mediaDirIndex=process.argv.indexOf("--ffmpeg-directory");
  if(mediaDirIndex!==-1){const dir=process.argv[mediaDirIndex+1];if(platform()!=="win32"||!dir||!isAbsolute(dir))throw new Error("INVALID_MEDIA_DIRECTORY");ffmpegBinary=join(dir,"ffmpeg.exe");ffprobeBinary=join(dir,"ffprobe.exe");}
  if(!(await dependency(ffmpegBinary))||!(await dependency(ffprobeBinary)))throw new Error("INSTALL_FFMPEG_AND_FFPROBE_FIRST");
  const dir=connectorStateDirectory(process.argv);await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
  const statePath=join(dir,"connector.json");let state;
  if(!process.argv.includes("--pair")){try{state=JSON.parse(await readFile(statePath,"utf8"));state.origin=trustedPlatformOrigin(state.origin);if(!/^[A-Za-z0-9_-]{43}$/.test(state.token))throw new Error("INVALID_STATE");}catch(error){if(error.code!=="ENOENT")throw new Error("INVALID_STATE_USE_PAIR");}}
  // Scheduled execution must never wait for an invisible interactive prompt.
  if(!state&&process.argv.includes("--run"))throw new Error("PAIR_INTERACTIVELY_FIRST");
  if(!state)state=await enroll(statePath);
  if(process.argv.includes("--pair-only")){console.log("INFRO pairing saved. You can now enable automatic startup.");return;}
  if(process.argv.includes("--startup-check")){console.error("INFRO_STARTUP_OK");return;}
  const workers=new Map();let stopping=false;
  // Fixed statuses only: never persist URLs, tokens, camera names or raw process output.
  const status=async value=>{try{const path=join(dir,"status.json"),temp=`${path}.tmp`;await writeFile(temp,JSON.stringify(connectorStatus(value,[...workers.values()])),{mode:0o600});await rename(temp,path);}catch{/* Status is observational; never affects access decisions. */}};
  const api=(path,options={})=>fetch(`${state.origin}/api/live-view/connectors/${path}`,{...options,headers:{Authorization:`Bearer ${state.token}`,"Content-Type":"application/json"},redirect:"error",signal:AbortSignal.timeout(12_000)});
  const report=async worker=>{try{await api("report",{method:"POST",body:JSON.stringify({id:worker.camera.id,version:worker.camera.version,nonce:worker.camera.nonce,status:worker.status})});}catch{/* Report only fixed status values, never raw FFmpeg output. */}};
  function stop(worker){worker.cancelled=true;worker.proc?.kill("SIGTERM");if(worker.proc){const proc=worker.proc;setTimeout(()=>{if(proc.exitCode===null)proc.kill("SIGKILL");},2000).unref();}}
  function stopAll(){for(const w of workers.values())stop(w);workers.clear();}
  async function start(worker){
    worker.status="probing";const result=await probe(worker.camera);if(worker.cancelled||stopping)return;
    if(result!=="ready"){worker.status=result;worker.retryAt=Date.now()+30_000;void report(worker);return;}
    const proc=spawn(ffmpegBinary,ffmpegArgs(worker.camera),{stdio:["ignore","ignore","ignore","pipe"],shell:false});
    worker.proc=proc;worker.startedAt=Date.now();worker.status="probing";let progress="";
    proc.stdio[3].on("data",chunk=>{progress=(progress+chunk.toString()).slice(-4096);if(/frame=\s*[1-9][0-9]*/.test(progress))worker.status="publishing";});
    const failed=()=>{if(worker.cancelled)return;worker.proc=null;worker.status="unavailable";worker.retryAt=Date.now()+10_000;};
    proc.on("error",failed);proc.on("close",failed);
  }
  const finish=()=>{stopping=true;stopAll();};process.once("SIGINT",finish);process.once("SIGTERM",finish);
  console.log("INFRO connector running. Manage cameras, search and customer links in your INFRO account.");
  let offline=false;
  while(!stopping){
    try{
      const response=await api("sync");
      if(response.status===401){finish();await status("revoked");console.error("Connection revoked. Generate a new code in INFRO and restart with --pair.");break;}
      if(!response.ok)throw new Error("SYNC_FAILED");
      const data=await response.json();if(!Array.isArray(data.cameras)||data.cameras.length>16)throw new Error("INVALID_CONFIG");
      if(data.cameras.some(camera=>!validAgentCamera(camera)))throw new Error("INVALID_CONFIG");
      const desired=new Set(data.cameras.map(c=>c.id));
      for(const [id,worker] of workers){if(!desired.has(id)){stop(worker);workers.delete(id);}}
      for(const camera of data.cameras){
        let worker=workers.get(camera.id);
        if(worker&&(worker.camera.version!==camera.version||worker.camera.nonce!==camera.nonce||publisherNeedsRestart(worker.startedAt)||(!worker.proc&&worker.retryAt&&worker.retryAt<=Date.now()))){stop(worker);workers.delete(camera.id);worker=null;}
        if(!worker){worker={camera,status:"probing",startedAt:Date.now(),proc:null,cancelled:false,retryAt:null};workers.set(camera.id,worker);void start(worker).catch(()=>{if(!worker.cancelled){worker.status="unavailable";worker.retryAt=Date.now()+30_000;}});}
      }
      // Parallel, bounded reports (max 16) cannot block the sync heartbeat.
      await Promise.allSettled([...workers.values()].map(report));
      await status("connected");
      if(offline){console.log("INFRO connection restored.");offline=false;}
    }catch{stopAll();await status("offline");if(!offline){console.error("INFRO unreachable. Video upload paused until a secure connection returns.");offline=true;}}
    if(!stopping)await new Promise(resolve=>setTimeout(resolve,10_000));
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(`INFRO_STARTUP_${startupFailureCode(error)}`);process.exitCode=1;});}
