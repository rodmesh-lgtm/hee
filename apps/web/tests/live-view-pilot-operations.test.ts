import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { taskXml, CONNECTOR_SHA256 } from "../public/connectors/infro-live-windows.mjs";
import { checkRelayGuard, checkDatabase, liveConfigChecks } from "../scripts/live-view-preflight.mjs";

test("Windows startup task safely represents special characters and stays in the paired user's identity",()=>{
  const xml=taskXml({sid:"S-1-5-21-123",node:'C:\\Program Files\\nodejs\\node.exe',connector:'C:\\Users\\A & B\\.infro-live\\bin\\connector.mjs',ffmpegDirectory:'C:\\Tools & Media'});
  assert.ok(xml.includes("A &amp; B"));assert.ok(!xml.includes("A & B"));
  assert.ok(xml.includes("&quot;"));assert.ok(xml.includes("--run"));assert.ok(xml.includes("--ffmpeg-directory"));
  assert.ok(xml.includes("<LogonType>InteractiveToken</LogonType>"));assert.ok(xml.includes("<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>"));
  assert.ok(!xml.includes("Password"));assert.ok(!xml.includes("HighestAvailable"));
});
test("installer checksum matches the exact distributed camera connector",async()=>{
  const bytes=await readFile(new URL("../public/connectors/infro-live-connector.mjs",import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"),CONNECTOR_SHA256);
});
test("preflight refuses missing config, plaintext origins and reused relay secrets",()=>{
  const good={LIVE_VIEW_ENABLED:"true",LIVE_VIEW_GATEWAY_SECRET:"a".repeat(40),LIVE_VIEW_RELAY_AUTH_SECRET:"b".repeat(40),LIVE_VIEW_CREDENTIAL_KEY:randomBytes(32).toString("base64"),LIVE_VIEW_GATEWAY_ORIGIN:"https://media.example.test",LIVE_VIEW_PUBLISH_ORIGIN:"rtmps://publish.example.test:1936"};
  assert.ok(liveConfigChecks(good).every(c=>c.ok));assert.ok(liveConfigChecks({}).every(c=>!c.ok));
  for(const bad of [{LIVE_VIEW_RELAY_AUTH_SECRET:good.LIVE_VIEW_GATEWAY_SECRET},{LIVE_VIEW_GATEWAY_ORIGIN:"http://media.example.test"},{LIVE_VIEW_PUBLISH_ORIGIN:"rtmp://publish.example.test:1936"},{LIVE_VIEW_CREDENTIAL_KEY:"invalid"}])assert.ok(liveConfigChecks({...good,...bad}).some(c=>!c.ok));
});
test("relay preflight requires both denial of anonymous reads and authenticated health",async()=>{
  const env={LIVE_VIEW_GATEWAY_ORIGIN:"https://media.example.test",LIVE_VIEW_GATEWAY_SECRET:"private"};
  const guarded:typeof fetch=async(_url,options)=>new Headers(options?.headers).has("Authorization")?new Response("INFRO relay guard ready"):new Response(null,{status:403});
  assert.equal(await checkRelayGuard(env,guarded),true);
  assert.equal(await checkRelayGuard(env,async()=>new Response("INFRO relay guard ready")),false);
  assert.equal(await checkRelayGuard(env,async()=>new Response(null,{status:403})),false);
  assert.equal(await checkRelayGuard(env,async()=>{throw new Error("offline")}),false);
});
test("database preflight needs both recorded migrations and all three service tables",async()=>{
  const rows=[{migration_name:"20261022160000_live_view"},{migration_name:"20261022180000_live_view_self_service"}];
  const client={query:async(sql:string)=>sql.includes("_prisma_migrations")?{rows}:{rows:[{station:"LiveViewStation",session:"LiveViewSession",connector:"LiveViewConnector"}]}};
  assert.equal(await checkDatabase(client),true);
  assert.equal(await checkDatabase({query:async()=>({rows:[]})}),false);
  assert.equal(await checkDatabase({query:async(sql:string)=>sql.includes("_prisma_migrations")?{rows}:{rows:[{station:"LiveViewStation",session:null,connector:null}]}}),false);
});
