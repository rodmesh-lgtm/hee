import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { getOwnedBusinessForApiWrite } from "../../../../lib/ownership";
import { consumePublicWriteLimit, requestClientAddress } from "../../../../lib/rate-limit";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../../lib/request-body";

const schema=z.object({orderedIds:z.array(z.string().min(1).max(128)).min(1).max(100)}).strict();

export async function POST(request:Request){
  const business=await getOwnedBusinessForApiWrite();
  if(!business)return NextResponse.json({error:"يرجى تسجيل الدخول وإنشاء النشاط أولاً"},{status:401});
  try{
    const identity=requestClientAddress(request)||business.ownerId;
    const rate=await consumePublicWriteLimit({scope:"dashboard-service-order",businessId:business.id,identity,limit:60,windowSeconds:10*60});
    if(!rate.allowed)return NextResponse.json({error:"تم حفظ ترتيبات كثيرة خلال وقت قصير. انتظر قليلاً ثم تابع."},{status:429,headers:{"Retry-After":String(Math.max(1,rate.retryAfterSeconds))}});
  }catch(error){console.error("[service-order] rate_limit_failed",{businessId:business.id,error});return NextResponse.json({error:"تعذر حفظ ترتيب الخدمات الآن."},{status:503})}

  let body:unknown;
  try{body=await readBoundedJson(request,16*1024)}catch(error){return NextResponse.json({error:error instanceof RequestBodyTooLargeError?"حجم الطلب أكبر من المسموح":"بيانات غير صالحة"},{status:error instanceof RequestBodyTooLargeError?413:400})}
  const parsed=schema.safeParse(body);
  if(!parsed.success||new Set(parsed.success?parsed.data.orderedIds:[]).size!==(parsed.success?parsed.data.orderedIds.length:0))return NextResponse.json({error:"ترتيب الخدمات غير صالح"},{status:400});

  try{
    const result=await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${business.id}:services`}))`;
      const current=await tx.service.findMany({where:{businessId:business.id,deletedAt:null},select:{id:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]});
      const currentIds=current.map(item=>item.id);
      if(currentIds.length!==parsed.data.orderedIds.length)return null;
      const allowed=new Set(currentIds);
      if(parsed.data.orderedIds.some(id=>!allowed.has(id)))return null;
      for(const [sortOrder,id] of parsed.data.orderedIds.entries())await tx.service.updateMany({where:{id,businessId:business.id,deletedAt:null},data:{sortOrder}});
      return business.slug;
    });
    if(!result)return NextResponse.json({error:"تغيّرت قائمة الخدمات. حدّث الصفحة ثم أعد الترتيب."},{status:409});
    revalidatePath("/dashboard/services");revalidatePath("/dashboard/my-page");revalidatePath("/preview");revalidatePath(`/${result}`);
    return NextResponse.json({ok:true,orderedIds:parsed.data.orderedIds});
  }catch(error){console.error("[service-order] write_failed",{businessId:business.id,error});return NextResponse.json({error:"تعذر حفظ ترتيب الخدمات الآن. حاول مرة أخرى."},{status:503})}
}
