#!/usr/bin/env node
/** Windows pilot setup. Run as the dedicated, signed-in camera machine user. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const CONNECTOR_SHA256="c87ee9992e96bc8a53f621e0881ec25c4524f7524c250af5caf52be240022f5a";
export const TASK_NAME="INFRO Live Connector";
export function xmlEscape(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));}
export function taskXml({sid,node,connector,ffmpegDirectory}){
  // InteractiveToken uses the SAME user's home and ACL-protected pairing token.
  // No password, camera address, or pairing code is stored in Task Scheduler.
  const x=xmlEscape;
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<RegistrationInfo><Description>INFRO camera connector; user must remain signed in.</Description></RegistrationInfo>
<Triggers><LogonTrigger><Enabled>true</Enabled><UserId>${x(sid)}</UserId></LogonTrigger></Triggers>
<Principals><Principal id="Owner"><UserId>${x(sid)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
<Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT0S</ExecutionTimeLimit><RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure></Settings>
<Actions Context="Owner"><Exec><Command>${x(node)}</Command><Arguments>${x(`"${connector}" --run --ffmpeg-directory "${ffmpegDirectory}"`)}</Arguments></Exec></Actions></Task>`;
}
function run(binary,args,options={}){return spawnSync(binary,args,{shell:false,windowsHide:true,...options});}
function executable(binary){const r=run("where.exe",[binary],{encoding:"utf8"});if(r.status!==0)throw new Error(`MISSING_${binary.toUpperCase()}`);return r.stdout.trim().split(/\r?\n/)[0];}
export async function main(){
  if(platform()!=="win32")throw new Error("WINDOWS_REQUIRED");
  if(Number(process.versions.node.split(".")[0])<20)throw new Error("NODE_20_REQUIRED");
  const ffmpeg=executable("ffmpeg"),ffprobe=executable("ffprobe");
  if(run(ffmpeg,["-version"],{stdio:"ignore"}).status!==0||run(ffprobe,["-version"],{stdio:"ignore"}).status!==0)throw new Error("FFMPEG_CHECK_FAILED");
  if(process.argv.includes("--check")){console.log("PASS: Windows, Node, FFmpeg and FFprobe. Camera connectivity is checked after pairing in INFRO.");return;}
  if(!process.argv.includes("--install"))throw new Error("USE_CHECK_OR_INSTALL");
  if(run("schtasks.exe",["/Query","/TN",TASK_NAME],{stdio:"ignore"}).status===0)throw new Error("TASK_EXISTS_STOP_AND_REMOVE_BEFORE_REINSTALL");
  // Windows ignores Unix mode bits. Remove inherited access before saving any token.
  const identity=run("whoami.exe",["/user","/fo","csv","/nh"],{encoding:"utf8"});
  const sid=identity.stdout?.match(/S-1-[0-9-]+/)?.[0];if(identity.status!==0||!sid)throw new Error("USER_ID_CHECK_FAILED");
  const dir=join(homedir(),".infro-live"),bin=join(dir,"bin");
  await mkdir(dir,{recursive:true});
  if(run("icacls.exe",[dir,"/inheritance:r","/grant:r",`*${sid}:(OI)(CI)F`,"*S-1-5-18:(OI)(CI)F"],{stdio:"ignore"}).status!==0)throw new Error("TOKEN_ACCESS_PROTECTION_FAILED");
  await mkdir(bin,{recursive:true});
  const response=await fetch("https://ir.sa/connectors/infro-live-connector.mjs",{redirect:"error",signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw new Error("DOWNLOAD_FAILED");
  if(Number(response.headers.get("content-length")||0)>100_000)throw new Error("DOWNLOAD_TOO_LARGE");
  const source=Buffer.from(await response.arrayBuffer());
  if(source.length>100_000||createHash("sha256").update(source).digest("hex")!==CONNECTOR_SHA256)throw new Error("DOWNLOAD_CHECKSUM_FAILED_DOWNLOAD_LATEST_SETUP");
  const connector=join(bin,"infro-live-connector.mjs");await writeFile(connector,source);
  console.log("In your INFRO account, add the site and generate a one-use pairing code. Camera passwords are entered only in INFRO.");
  const paired=run(process.execPath,[connector,"--pair-only"],{stdio:"inherit"});
  if(paired.status!==0)throw new Error("PAIRING_FAILED_NO_STARTUP_TASK_CREATED");
  const state=JSON.parse(await readFile(join(dir,"connector.json"),"utf8"));
  if(!/^[A-Za-z0-9_-]{43}$/.test(state.token)||state.origin!=="https://ir.sa")throw new Error("PAIR_WITH_HTTPS_IR_SA");
  const ffmpegDirectory=ffmpeg.slice(0,ffmpeg.lastIndexOf("\\"));
  if(ffprobe.slice(0,ffprobe.lastIndexOf("\\")).toLowerCase()!==ffmpegDirectory.toLowerCase())throw new Error("PUT_FFMPEG_AND_FFPROBE_IN_THE_SAME_DIRECTORY");
  const xml=join(dir,"startup.xml");
  try{
    await writeFile(xml,"\uFEFF"+taskXml({sid,node:process.execPath,connector,ffmpegDirectory}),"utf16le");
    if(run("schtasks.exe",["/Create","/TN",TASK_NAME,"/XML",xml],{stdio:"ignore"}).status!==0)throw new Error("TASK_REGISTRATION_FAILED");
  }finally{await rm(xml,{force:true});}
  if(run("schtasks.exe",["/Run","/TN",TASK_NAME],{stdio:"ignore"}).status!==0)throw new Error("TASK_REGISTERED_BUT_COULD_NOT_START");
  console.log("Startup task registered and start requested. Confirm the site becomes connected in INFRO. Keep Windows awake and this user signed in; after restart sign in again. This is not a boot-time system service.");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(`INFRO setup: ${/^[A-Z0-9_]+$/.test(error.message)?error.message:"SETUP_FAILED_CHECK_PREREQUISITES"}`);process.exitCode=1;});}
