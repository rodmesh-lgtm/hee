import {NextResponse} from "next/server";
import {getCurrentUserForApiWrite} from "../../../lib/auth";
import {isAdminEmail} from "../../../lib/admin";
import {billingReadiness,probeMoyasarCredential} from "../../../lib/billing-readiness";
import {consumePublicWriteLimit} from "../../../lib/rate-limit";
export const dynamic="force-dynamic";
async function actor(){const user=await getCurrentUserForApiWrite();return user?.emailVerifiedAt&&isAdminEmail(user.email)?user:null;}
export async function GET(){if(!await actor())return NextResponse.json({ok:false},{status:403});return NextResponse.json(await billingReadiness(),{headers:{"cache-control":"private, no-store"}});}
export async function POST(request:Request){const user=await actor();if(!user)return NextResponse.json({ok:false},{status:403});const origin=request.headers.get("origin");if(origin!==new URL(request.url).origin)return NextResponse.json({ok:false},{status:403});const limit=await consumePublicWriteLimit({businessId:"platform-billing",scope:"billing-provider-probe",identity:user.id,limit:3,windowSeconds:600});if(!limit.allowed)return NextResponse.json({ok:false,code:"rate_limited"},{status:429});return NextResponse.json(await probeMoyasarCredential(),{headers:{"cache-control":"private, no-store"}});}
