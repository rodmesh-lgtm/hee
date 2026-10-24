"use server";
import { normalizePageModulesForPersistence } from "../lib/page-modules";
import { normalizeInvoicePhone } from "../lib/invoice-contact";
import { LaundryInputError } from "../lib/laundry-domain";
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
  revalidatePath("/Laundromat");revalidatePath("/Accounting");revalidatePath("/dashboard/branding");revalidatePath(`/${business.slug}`);
  return {ok:true};
}

export async function saveInvoiceContact(form:FormData):Promise<{ok:boolean;error?:string}> {
 const user=await getCurrentUserForApiWrite();if(!user)return {ok:false,error:"يرجى تسجيل الدخول بحساب موثّق"};
 const business=await getActiveBusinessForUser(user.id,"laundry");
 if(!business||business.ownerId!==user.id||form.get("businessId")!==business.id)return {ok:false,error:"تعديل بيانات الفواتير متاح لمالك المنشأة النشطة فقط"};
 try {
  const raw=String(form.get("invoicePhone")??"");if(raw.length>40)throw new LaundryInputError("رقم التواصل طويل جدًا");
  const phone=normalizeInvoicePhone(raw);
  await db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`page-modules:${business.id}`}))`;
   const current=await tx.business.findFirst({where:{id:business.id,ownerId:user.id,deletedAt:null},select:{pageModules:true,businessType:true,updatedAt:true}});
   if(!current)throw new LaundryInputError("المنشأة غير متاحة");
   const modules=normalizePageModulesForPersistence(current.pageModules,current.businessType).map(module=>module.id==="contact"?{...module,config:{...module.config,invoicePhone:phone}}:module);
   const changed=await tx.business.updateMany({where:{id:business.id,ownerId:user.id,deletedAt:null,updatedAt:current.updatedAt},data:{pageModules:JSON.parse(JSON.stringify(modules))}});
   if(changed.count!==1)throw new LaundryInputError("تغيرت بيانات المنشأة؛ حدّث الصفحة ثم أعد حفظ رقم التواصل");
   await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${randomUUID()},${business.id},${user.id},'invoice-contact',${business.id})`;
  });
  revalidatePath("/Laundromat");revalidatePath("/Accounting");revalidatePath("/Laundromat/Accounting");return {ok:true};
 }catch(e){return {ok:false,error:e instanceof LaundryInputError?e.message:"تعذر حفظ رقم التواصل. أعد المحاولة"};}
}
