#!/usr/bin/env node
/** Read-only operator checks. Never applies migrations or enables the product. */
import { pathToFileURL } from "node:url";
import { connect } from "node:tls";
export function liveConfigChecks(env){
  const checks=[];
  const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
  check("enabled",env.LIVE_VIEW_ENABLED==="true");
  check("gateway_secret",(env.LIVE_VIEW_GATEWAY_SECRET||"").length>=32);
  check("relay_secret",(env.LIVE_VIEW_RELAY_AUTH_SECRET||"").length>=32&&env.LIVE_VIEW_RELAY_AUTH_SECRET!==env.LIVE_VIEW_GATEWAY_SECRET);
  const key=env.LIVE_VIEW_CREDENTIAL_KEY||"";
  check("credential_key",/^[A-Za-z0-9+/]{43}=$/.test(key)&&Buffer.from(key,"base64").length===32);
  for(const [name,raw,protocol] of [["gateway_origin",env.LIVE_VIEW_GATEWAY_ORIGIN,"https:"],["publish_origin",env.LIVE_VIEW_PUBLISH_ORIGIN,"rtmps:"]]){
    try{const u=new URL(raw);check(name,u.protocol===protocol&&!u.username&&!u.password&&["","/"].includes(u.pathname)&&!u.search&&!u.hash);}catch{check(name,false);}
  }
  return checks;
}
export async function checkRelayGuard(env,fetcher=fetch){
  const url=new URL("/_infro/health",env.LIVE_VIEW_GATEWAY_ORIGIN);
  const request=headers=>fetcher(url,{headers,redirect:"error",signal:AbortSignal.timeout(8_000)});
  try{
    const anonymous=await request({}),authorized=await request({Authorization:`Bearer ${env.LIVE_VIEW_GATEWAY_SECRET}`});
    return anonymous.status===403&&authorized.status===200&&(await authorized.text())==="INFRO relay guard ready";
  }catch{return false;}
}
export async function checkPublishTls(origin){
  const u=new URL(origin);
  return new Promise(resolve=>{
    const socket=connect({host:u.hostname,port:Number(u.port||1936),servername:u.hostname,rejectUnauthorized:true});
    const finish=ok=>{socket.destroy();resolve(ok);};
    socket.setTimeout(8_000,()=>finish(false));socket.once("error",()=>finish(false));socket.once("secureConnect",()=>finish(socket.authorized));
  });
}
export async function checkDatabase(client){
  // Check additive service migrations, not a different database or a loose model push.
  const migrations=await client.query(`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ANY($1::text[]) AND finished_at IS NOT NULL AND rolled_back_at IS NULL`,[["20261022160000_live_view","20261022180000_live_view_self_service"]]);
  if(new Set(migrations.rows.map(r=>r.migration_name)).size!==2)return false;
  const tables=await client.query(`SELECT to_regclass('public."LiveViewStation"') AS station, to_regclass('public."LiveViewSession"') AS session, to_regclass('public."LiveViewConnector"') AS connector`);
  return Boolean(tables.rows[0]?.station&&tables.rows[0]?.session&&tables.rows[0]?.connector);
}
export async function main(){
  const checks=liveConfigChecks(process.env);
  if(checks.every(c=>c.ok)&&process.argv.includes("--relay")){
    checks.push({name:"relay_guard_authorization",ok:await checkRelayGuard(process.env)});
    checks.push({name:"publish_trusted_tls",ok:await checkPublishTls(process.env.LIVE_VIEW_PUBLISH_ORIGIN)});
  }
  if(process.argv.includes("--database")){
    let client;
    try{
      const url=new URL(process.env.DATABASE_URL||"");
      if(!["postgres:","postgresql:"].includes(url.protocol)||url.searchParams.get("sslmode")!=="verify-full")throw new Error("VERIFIED_DATABASE_REQUIRED");
      const {Client}=await import("pg");client=new Client({connectionString:url.toString(),connectionTimeoutMillis:8000,statement_timeout:8000});
      await client.connect();checks.push({name:"database_migrations",ok:await checkDatabase(client)});
    }catch{checks.push({name:"database_migrations",ok:false});}finally{await client?.end().catch(()=>{});}
  }
  for(const check of checks)console.log(`${check.ok?"PASS":"FAIL"} ${check.name}`);
  console.log("This checks configuration and requested infrastructure only. A real camera, browser playback and link revocation still require the pilot acceptance test.");
  if(checks.some(c=>!c.ok))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(()=>{console.error("FAIL preflight_unavailable");process.exitCode=1;});}
