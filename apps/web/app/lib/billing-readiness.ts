import "server-only";
import { db } from "./db";
const val=(k:string)=>String(process.env[k]??"").trim();
export function billingConfigurationStatus(){
 const publicKey=val("MOYASAR_PUBLISHABLE_KEY"),secret=val("MOYASAR_SECRET_KEY");
 const publicMode=publicKey.startsWith("pk_live_")?"live":publicKey.startsWith("pk_test_")?"test":"missing_or_invalid";
 const secretMode=secret.startsWith("sk_live_")?"live":secret.startsWith("sk_test_")?"test":"missing_or_invalid";
 let tokenKeyValid=false;try{tokenKeyValid=Buffer.from(val("BILLING_TOKEN_ENCRYPTION_KEY"),"base64").length===32;}catch{}
 return {provider:val("PAYMENT_PROVIDER")==="moyasar",publicMode,secretMode,matchingLiveKeys:publicMode==="live"&&secretMode==="live",webhookSecretConfigured:val("MOYASAR_WEBHOOK_SECRET").length>=24,tokenKeyValid,sellerNameConfigured:Boolean(val("BILLING_SELLER_LEGAL_NAME_AR")),sellerAddressConfigured:Boolean(val("BILLING_SELLER_ADDRESS_AR")),taxStatusConfigured:["not_registered","vat_registered"].includes(val("BILLING_TAX_STATUS")),taxIntegrationReady:val("BILLING_TAX_STATUS")==="not_registered",renewalEnabled:val("BILLING_RENEWAL_ENABLED")==="true",operationsReady:val("BILLING_OPERATIONS_READY")==="true",publicCheckoutEnabled:val("PAID_CHECKOUT_PUBLIC_ENABLED")==="true"};
}
export async function billingReadiness(){
 const config=billingConfigurationStatus();
 const heartbeat=await db.billingOperationsHeartbeat.findUnique({where:{id:"billing-operations"},select:{lastSucceededAt:true,releaseSha:true}});
 const sha=val("VERCEL_GIT_COMMIT_SHA")||val("RELEASE_SHA");
 return {...config,workerObserved:Boolean(heartbeat&&Date.now()-heartbeat.lastSucceededAt.getTime()<90*60000&&heartbeat.releaseSha===sha),workerLastSuccess:heartbeat?.lastSucceededAt.toISOString()??null};
}
export async function probeMoyasarCredential(){
 const config=billingConfigurationStatus();
 if(config.secretMode==="missing_or_invalid")return {ok:false,code:"secret_key_missing_or_invalid",mode:config.secretMode};
 try{
  const response=await fetch("https://api.moyasar.com/v1/payments?per=1",{method:"GET",cache:"no-store",signal:AbortSignal.timeout(12000),headers:{authorization:`Basic ${Buffer.from(val("MOYASAR_SECRET_KEY")+":").toString("base64")}`,accept:"application/json"}});
  await response.body?.cancel();
  return {ok:response.ok,code:response.ok?"credential_verified":response.status===401?"credential_rejected":"provider_unavailable",mode:config.secretMode,status:response.status};
 }catch{return {ok:false,code:"provider_unreachable",mode:config.secretMode};}
}
