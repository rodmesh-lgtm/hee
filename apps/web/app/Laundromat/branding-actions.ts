"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUserForApiWrite } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getPersistentStorageAdapter } from "../lib/storage";
import { removePersistentUrl } from "../lib/storage-lifecycle";
import { consumePublicWriteLimit } from "../lib/rate-limit";

export async function saveLaundryLogo(form: FormData): Promise<{ok:boolean;error?:string}> {
  const user=await getCurrentUserForApiWrite();
  if(!user)return {ok:false,error:"يرجى تسجيل الدخول بحساب موثّق"};
  const business=await getActiveBusinessForUser(user.id,"laundry");
  if(!business||business.ownerId!==user.id)return {ok:false,error:"تعديل الشعار متاح لمالك المنشأة فقط"};
  if(form.get("businessId")!==business.id)return {ok:false,error:"تغيرت المنشأة النشطة. حدّث الصفحة قبل الرفع."};
  const file=form.get("logoFile");
  if(!(file instanceof File)||!file.size||file.size>2*1024*1024)return {ok:false,error:"اختر صورة شعار بحجم لا يتجاوز 2 ميجابايت"};
  const folder=`logos/${business.id}`;let url:string|undefined;
  try{
    const rate=await consumePublicWriteLimit({scope:"branding-images",businessId:business.id,identity:user.id,limit:30,windowSeconds:3600});
    if(!rate.allowed)return {ok:false,error:"محاولات رفع كثيرة. حاول لاحقًا."};
    // The shared adapter verifies file signatures and restricts this folder to images.
    url=(await getPersistentStorageAdapter().upload({file,folder})).url;
    await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`branding-images:${business.id}`}))`;
      const result=await tx.business.updateMany({where:{id:business.id,ownerId:user.id,deletedAt:null},data:{logoUrl:url}});
      if(result.count!==1)throw new Error("BUSINESS_UNAVAILABLE");
      await tx.$executeRaw`INSERT INTO "LaundryAudit" ("id","businessId","actorId","action","targetId") VALUES (${randomUUID()},${business.id},${user.id},'branding',${business.id})`;
    });
  }catch{
    if(url)await removePersistentUrl(url,folder).catch(()=>undefined);
    return {ok:false,error:"تعذر حفظ الشعار. تأكد من أن الملف صورة JPG أو PNG أو WebP أو GIF صالحة، ثم حاول مرة أخرى."};
  }
  revalidatePath("/Laundromat");revalidatePath("/dashboard/branding");revalidatePath(`/${business.slug}`);
  return {ok:true};
}
