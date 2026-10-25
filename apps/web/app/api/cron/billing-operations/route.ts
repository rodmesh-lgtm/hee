import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "../../../lib/db";
import {billingConfigurationStatus} from "../../../lib/billing-readiness";
import {recoverOpenMoyasarCheckoutPayments,recoverPendingMoyasarWebhookEvents} from "../../../lib/moyasar-webhook-processing";
import {runBillingRenewalWorker} from "../../../../scripts/billing-renewal-worker";
import {runBillingStateAudit} from "../../../../scripts/billing-state-audit";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=300;
export async function GET(request:Request){const secret=String(process.env.CRON_SECRET??"");const expected=Buffer.from(`Bearer ${secret}`),supplied=Buffer.from(request.headers.get("authorization")??"");if(secret.length<32||expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return NextResponse.json({ok:false},{status:401});const c=billingConfigurationStatus();if(!c.renewalEnabled)return NextResponse.json({ok:true,enabled:false});if(!c.provider||!c.matchingLiveKeys||!c.webhookSecretConfigured||!c.tokenKeyValid||!c.sellerNameConfigured||!c.sellerAddressConfigured||!c.taxIntegrationReady)return NextResponse.json({ok:false,code:"billing_configuration_incomplete"},{status:503});
 const key="billing:operations:lease",now=new Date();
 const rows=await db.$queryRaw<Array<{key:string}>>`INSERT INTO "RequestRateLimit" (key,"windowStart",count,"updatedAt") VALUES (${key},${now},1,${now}) ON CONFLICT (key) DO UPDATE SET "windowStart"=EXCLUDED."windowStart","updatedAt"=EXCLUDED."updatedAt" WHERE "RequestRateLimit"."updatedAt"<${new Date(now.getTime()-10*60000)} RETURNING key`;
 if(!rows.length)return NextResponse.json({ok:true,busy:true});
 try{const webhook=await recoverPendingMoyasarWebhookEvents(2),checkout=await recoverOpenMoyasarCheckoutPayments(2);if(webhook.errors||checkout.errors)throw new Error("BILLING_RECOVERY_FAILED");await runBillingRenewalWorker();await runBillingStateAudit();return NextResponse.json({ok:true,enabled:true});}
 catch{console.error("[billing-operations] processing failed; heartbeat not advanced");return NextResponse.json({ok:false,code:"billing_operations_failed"},{status:503});}
 finally{await db.$executeRaw`DELETE FROM "RequestRateLimit" WHERE key=${key} AND "windowStart"=${now}`;}
}
