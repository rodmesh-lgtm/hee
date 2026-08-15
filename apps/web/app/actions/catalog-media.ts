"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getOwnedBusinessForWrite } from "../lib/ownership";
import { getStorageAdapter } from "../lib/storage";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";
import { offerSchema, productSchema, serviceSchema } from "../lib/page-builder-validation";

export type BuilderActionState = { error?: string; success?: string };

function resolveFormData(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData) {
  if (prevOrFormData instanceof FormData) return prevOrFormData;
  if (maybeFormData instanceof FormData) return maybeFormData;
  throw new Error("تعذر قراءة بيانات النموذج");
}
function formValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}
function formBool(formData: FormData, key: string) { return String(formData.get(key) ?? "off") === "on"; }
async function uploadOptionalImage(formData: FormData, fieldName: string, folder: string) {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size <= 0) return null;
  return (await getStorageAdapter().upload({ file, folder })).url;
}
async function cleanupUncommitted(url: string | null | undefined, folder: string) {
  if (!url) return;
  try { await removePersistentUrl(url, folder); } catch (error) { console.error("[storage] failed to clean uncommitted media", { folder, url, error }); }
}
async function cleanupReplaced(previous: string | null | undefined, next: string | null | undefined, folder: string) {
  try { await removeReplacedPersistentUrl(previous, next, folder); } catch (error) { console.error("[storage] failed to clean replaced media", { folder, previous, next, error }); }
}
async function cleanupDeleted(url: string | null | undefined, folder: string) {
  try { await removePersistentUrl(url, folder); } catch (error) { console.error("[storage] failed to clean deleted media", { folder, url, error }); }
}
function refresh(slug: string) {
  revalidatePath("/dashboard/page-builder");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/gallery");
  revalidatePath(`/${slug}`);
}

export async function addProductBuilderAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const business = await getOwnedBusinessForWrite();
  if (!business) return { error: "ابدأ بإنشاء النشاط أولاً" };
  const parsed = productSchema.safeParse({
    name: formValue(formData, "name"), description: formValue(formData, "description"), categoryName: formValue(formData, "categoryName"), unit: formValue(formData, "unit"),
    price: Number(formValue(formData, "price", "0")), oldPrice: formValue(formData, "oldPrice") ? Number(formValue(formData, "oldPrice")) : null,
    isActive: formBool(formData, "isActive"), featured: formBool(formData, "featured"), sortOrder: Number(formValue(formData, "sortOrder", "0")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات المنتج غير صالحة" };
  let categoryId: string | null = null;
  if (parsed.data.categoryName) {
    const category = await db.category.upsert({ where: { businessId_name: { businessId: business.id, name: parsed.data.categoryName } }, update: { isActive: true }, create: { businessId: business.id, name: parsed.data.categoryName } });
    categoryId = category.id;
  }
  let imageUrl: string | null = null;
  try { imageUrl = await uploadOptionalImage(formData, "imageFile", "products"); }
  catch (error) { return { error: error instanceof Error ? error.message : "تعذر رفع صورة المنتج" }; }
  try {
    await db.product.create({ data: { businessId: business.id, name: parsed.data.name, description: parsed.data.description, categoryId, unit: parsed.data.unit || null, price: parsed.data.price, oldPrice: parsed.data.oldPrice, imageUrl, isActive: parsed.data.isActive, featured: parsed.data.featured, sortOrder: parsed.data.sortOrder } });
  } catch (error) {
    await cleanupUncommitted(imageUrl, "products");
    return { error: error instanceof Error ? error.message : "تعذر إضافة المنتج" };
  }
  refresh(business.slug); return { success: "تمت إضافة المنتج" };
}

export async function updateProductBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData = resolveFormData(prevOrFormData, maybeFormData); const business = await getOwnedBusinessForWrite(); if (!business) return { error: "ابدأ بإنشاء النشاط أولاً" };
  const productId = formValue(formData, "productId"); const product = await db.product.findFirst({ where: { id: productId, businessId: business.id } }); if (!product) return { error: "المنتج غير موجود" };
  const parsed = productSchema.safeParse({ name: formValue(formData,"name"), description: formValue(formData,"description"), categoryName: formValue(formData,"categoryName"), unit: formValue(formData,"unit"), price:Number(formValue(formData,"price","0")), oldPrice:formValue(formData,"oldPrice")?Number(formValue(formData,"oldPrice")):null, isActive:formBool(formData,"isActive"), featured:formBool(formData,"featured"), sortOrder:Number(formValue(formData,"sortOrder","0")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات المنتج غير صالحة" };
  let categoryId: string | null = null;
  if (parsed.data.categoryName) { const category = await db.category.upsert({ where:{businessId_name:{businessId:business.id,name:parsed.data.categoryName}}, update:{isActive:true}, create:{businessId:business.id,name:parsed.data.categoryName} }); categoryId=category.id; }
  let imageUrl: string | null = null; try { imageUrl=await uploadOptionalImage(formData,"imageFile","products"); } catch(error){ return {error:error instanceof Error?error.message:"تعذر رفع صورة المنتج"}; }
  const nextImageUrl=imageUrl??product.imageUrl;
  try { await db.product.update({ where:{id:product.id}, data:{name:parsed.data.name,description:parsed.data.description,categoryId,unit:parsed.data.unit||null,price:parsed.data.price,oldPrice:parsed.data.oldPrice,isActive:parsed.data.isActive,featured:parsed.data.featured,sortOrder:parsed.data.sortOrder,...(imageUrl?{imageUrl}:{})} }); }
  catch(error){ await cleanupUncommitted(imageUrl,"products"); return {error:error instanceof Error?error.message:"تعذر تحديث المنتج"}; }
  await cleanupReplaced(product.imageUrl,nextImageUrl,"products"); refresh(business.slug); return {success:"تم تحديث المنتج"};
}

export async function deleteProductBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData=resolveFormData(prevOrFormData,maybeFormData); const business=await getOwnedBusinessForWrite(); if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"}; const productId=formValue(formData,"productId"); const product=await db.product.findFirst({where:{id:productId,businessId:business.id}}); if(!product)return{error:"المنتج غير موجود"};
  await db.product.delete({where:{id:product.id}}); await cleanupDeleted(product.imageUrl,"products"); refresh(business.slug); return{success:"تم حذف المنتج"};
}

export async function addServiceBuilderAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const business=await getOwnedBusinessForWrite(); if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"}; const parsed=serviceSchema.safeParse({name:formValue(formData,"name"),description:formValue(formData,"description"),price:Number(formValue(formData,"price","0")),durationMinutes:formValue(formData,"durationMinutes")?Number(formValue(formData,"durationMinutes")):null,bookingEnabled:formBool(formData,"bookingEnabled"),isActive:formBool(formData,"isActive"),sortOrder:Number(formValue(formData,"sortOrder","0"))}); if(!parsed.success)return{error:parsed.error.issues[0]?.message??"بيانات الخدمة غير صالحة"};
  let imageUrl:string|null=null; try{imageUrl=await uploadOptionalImage(formData,"imageFile","services");}catch(error){return{error:error instanceof Error?error.message:"تعذر رفع صورة الخدمة"};}
  try{await db.service.create({data:{businessId:business.id,name:parsed.data.name,description:parsed.data.description,price:parsed.data.price,durationMinutes:parsed.data.durationMinutes,imageUrl,bookingEnabled:parsed.data.bookingEnabled,isActive:parsed.data.isActive,sortOrder:parsed.data.sortOrder}});}catch(error){await cleanupUncommitted(imageUrl,"services");return{error:error instanceof Error?error.message:"تعذر إضافة الخدمة"};} refresh(business.slug);return{success:"تمت إضافة الخدمة"};
}

export async function updateServiceBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData=resolveFormData(prevOrFormData,maybeFormData);const business=await getOwnedBusinessForWrite();if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"};const serviceId=formValue(formData,"serviceId");const service=await db.service.findFirst({where:{id:serviceId,businessId:business.id}});if(!service)return{error:"الخدمة غير موجودة"};const parsed=serviceSchema.safeParse({name:formValue(formData,"name"),description:formValue(formData,"description"),price:Number(formValue(formData,"price","0")),durationMinutes:formValue(formData,"durationMinutes")?Number(formValue(formData,"durationMinutes")):null,bookingEnabled:formBool(formData,"bookingEnabled"),isActive:formBool(formData,"isActive"),sortOrder:Number(formValue(formData,"sortOrder","0"))});if(!parsed.success)return{error:parsed.error.issues[0]?.message??"بيانات الخدمة غير صالحة"};
  let imageUrl:string|null=null;try{imageUrl=await uploadOptionalImage(formData,"imageFile","services");}catch(error){return{error:error instanceof Error?error.message:"تعذر رفع صورة الخدمة"};}const nextImageUrl=imageUrl??service.imageUrl;try{await db.service.update({where:{id:service.id},data:{name:parsed.data.name,description:parsed.data.description,price:parsed.data.price,durationMinutes:parsed.data.durationMinutes,bookingEnabled:parsed.data.bookingEnabled,isActive:parsed.data.isActive,sortOrder:parsed.data.sortOrder,...(imageUrl?{imageUrl}:{})}});}catch(error){await cleanupUncommitted(imageUrl,"services");return{error:error instanceof Error?error.message:"تعذر تحديث الخدمة"};}await cleanupReplaced(service.imageUrl,nextImageUrl,"services");refresh(business.slug);return{success:"تم تحديث الخدمة"};
}

export async function deleteServiceBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData=resolveFormData(prevOrFormData,maybeFormData);const business=await getOwnedBusinessForWrite();if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"};const serviceId=formValue(formData,"serviceId");const service=await db.service.findFirst({where:{id:serviceId,businessId:business.id}});if(!service)return{error:"الخدمة غير موجودة"};await db.service.delete({where:{id:service.id}});await cleanupDeleted(service.imageUrl,"services");refresh(business.slug);return{success:"تم حذف الخدمة"};
}

export async function addOfferBuilderAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const business=await getOwnedBusinessForWrite();if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"};const parsed=offerSchema.safeParse({title:formValue(formData,"title"),description:formValue(formData,"description"),discountLabel:formValue(formData,"discountLabel"),startsAt:formValue(formData,"startsAt"),endsAt:formValue(formData,"endsAt"),isActive:formBool(formData,"isActive"),sortOrder:Number(formValue(formData,"sortOrder","0"))});if(!parsed.success)return{error:parsed.error.issues[0]?.message??"بيانات العرض غير صالحة"};let imageUrl:string|null=null;try{imageUrl=await uploadOptionalImage(formData,"imageFile","offers");}catch(error){return{error:error instanceof Error?error.message:"تعذر رفع صورة العرض"};}
  try{await db.offer.create({data:{businessId:business.id,title:parsed.data.title,description:parsed.data.description,discountLabel:parsed.data.discountLabel,startsAt:parsed.data.startsAt?new Date(parsed.data.startsAt):null,endsAt:parsed.data.endsAt?new Date(parsed.data.endsAt):null,isActive:parsed.data.isActive,sortOrder:parsed.data.sortOrder,imageUrl}});}catch(error){await cleanupUncommitted(imageUrl,"offers");return{error:error instanceof Error?error.message:"تعذر إضافة العرض"};}refresh(business.slug);return{success:"تمت إضافة العرض"};
}

export async function updateOfferBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData=resolveFormData(prevOrFormData,maybeFormData);const business=await getOwnedBusinessForWrite();if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"};const offerId=formValue(formData,"offerId");const offer=await db.offer.findFirst({where:{id:offerId,businessId:business.id}});if(!offer)return{error:"العرض غير موجود"};const parsed=offerSchema.safeParse({title:formValue(formData,"title"),description:formValue(formData,"description"),discountLabel:formValue(formData,"discountLabel"),startsAt:formValue(formData,"startsAt"),endsAt:formValue(formData,"endsAt"),isActive:formBool(formData,"isActive"),sortOrder:Number(formValue(formData,"sortOrder","0"))});if(!parsed.success)return{error:parsed.error.issues[0]?.message??"بيانات العرض غير صالحة"};let imageUrl:string|null=null;try{imageUrl=await uploadOptionalImage(formData,"imageFile","offers");}catch(error){return{error:error instanceof Error?error.message:"تعذر رفع صورة العرض"};}const nextImageUrl=imageUrl??offer.imageUrl;try{await db.offer.update({where:{id:offer.id},data:{title:parsed.data.title,description:parsed.data.description,discountLabel:parsed.data.discountLabel,startsAt:parsed.data.startsAt?new Date(parsed.data.startsAt):null,endsAt:parsed.data.endsAt?new Date(parsed.data.endsAt):null,isActive:parsed.data.isActive,sortOrder:parsed.data.sortOrder,...(imageUrl?{imageUrl}:{})}});}catch(error){await cleanupUncommitted(imageUrl,"offers");return{error:error instanceof Error?error.message:"تعذر تحديث العرض"};}await cleanupReplaced(offer.imageUrl,nextImageUrl,"offers");refresh(business.slug);return{success:"تم تحديث العرض"};
}

export async function deleteOfferBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData=resolveFormData(prevOrFormData,maybeFormData);const business=await getOwnedBusinessForWrite();if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"};const offerId=formValue(formData,"offerId");const offer=await db.offer.findFirst({where:{id:offerId,businessId:business.id}});if(!offer)return{error:"العرض غير موجود"};await db.offer.delete({where:{id:offer.id}});await cleanupDeleted(offer.imageUrl,"offers");refresh(business.slug);return{success:"تم حذف العرض"};
}

export async function addGalleryItemBuilderAction(_prev: BuilderActionState, formData: FormData): Promise<BuilderActionState> {
  const business=await getOwnedBusinessForWrite();if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"};const caption=formValue(formData,"caption");const sortOrder=Number(formValue(formData,"sortOrder","0"));let imageUrl:string|null=null;try{imageUrl=await uploadOptionalImage(formData,"imageFile","gallery");}catch(error){return{error:error instanceof Error?error.message:"تعذر رفع صورة المعرض"};}if(!imageUrl)return{error:"صورة المعرض مطلوبة"};
  try{await db.galleryItem.create({data:{businessId:business.id,imageUrl,caption:caption||null,sortOrder:Number.isNaN(sortOrder)?0:sortOrder,isActive:true}});}catch(error){await cleanupUncommitted(imageUrl,"gallery");return{error:error instanceof Error?error.message:"تعذر إضافة صورة المعرض"};}refresh(business.slug);return{success:"تمت إضافة صورة المعرض"};
}

export async function updateGalleryItemBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData=resolveFormData(prevOrFormData,maybeFormData);const business=await getOwnedBusinessForWrite();if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"};const galleryItemId=formValue(formData,"galleryItemId");const item=await db.galleryItem.findFirst({where:{id:galleryItemId,businessId:business.id}});if(!item)return{error:"الصورة غير موجودة"};const caption=formValue(formData,"caption");const sortOrder=Number(formValue(formData,"sortOrder","0"));await db.galleryItem.update({where:{id:item.id},data:{caption:caption||null,sortOrder:Number.isNaN(sortOrder)?item.sortOrder:sortOrder,isActive:formBool(formData,"isActive")}});refresh(business.slug);return{success:"تم تحديث الصورة"};
}

export async function deleteGalleryItemBuilderAction(prevOrFormData: BuilderActionState | FormData, maybeFormData?: FormData): Promise<BuilderActionState> {
  const formData=resolveFormData(prevOrFormData,maybeFormData);const business=await getOwnedBusinessForWrite();if(!business)return{error:"ابدأ بإنشاء النشاط أولاً"};const galleryItemId=formValue(formData,"galleryItemId");const item=await db.galleryItem.findFirst({where:{id:galleryItemId,businessId:business.id}});if(!item)return{error:"الصورة غير موجودة"};await db.galleryItem.delete({where:{id:item.id}});await cleanupDeleted(item.imageUrl,"gallery");refresh(business.slug);return{success:"تم حذف الصورة"};
}
