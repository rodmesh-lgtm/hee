import { NextResponse } from "next/server";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../../lib/request-body";
import { normalizePublicSlug } from "../../../../lib/public-url";
import { BookingVerificationError, requestBookingVerification, verifyBookingChallenge } from "../../../../lib/booking-verification";
export const maxDuration=60;
export async function POST(request:Request) {
  try {
    const body=await readBoundedJson(request,4096) as Record<string,unknown>;
    const slug=normalizePublicSlug(String(body.slug??""));
    if(!slug) return NextResponse.json({ok:false,error:"المنشأة غير صالحة"},{status:400});
    const data=body.operation==="verify"?await verifyBookingChallenge(slug,body.challengeId,body.code,request):await requestBookingVerification(slug,body.phone,body.consent,request);
    return NextResponse.json({ok:true,...data},{status:body.operation==="verify"?200:202,headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    const status=error instanceof BookingVerificationError?error.status:error instanceof RequestBodyTooLargeError?413:503;
    return NextResponse.json({ok:false,error:error instanceof BookingVerificationError?error.message:"تعذر إكمال التحقق الآن؛ حاول لاحقًا"},{status,headers:{"Cache-Control":"no-store"}});
  }
}
