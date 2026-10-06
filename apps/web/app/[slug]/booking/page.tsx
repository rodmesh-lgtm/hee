import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../lib/db";
import { canBusinessUsePublicSlug } from "../../lib/protected-public-slug";
import { normalizePublicSlug } from "../../lib/public-url";
import { hasActiveBusinessSubscription } from "../../lib/subscription-entitlement";
import { VisitorBookingManager } from "../../../components/public/visitor-booking-manager";
export const dynamic="force-dynamic";
export const metadata={title:"تعديل موعدي | INFRO",robots:{index:false,follow:false}};
export default async function VisitorBookingPage({params}:{params:Promise<{slug:string}>}) {
  const slug=normalizePublicSlug((await params).slug);
  const business=await db.business.findFirst({where:{slug,isPublished:true,deletedAt:null,bookingAvailable:true,owner:{deletedAt:null,emailVerifiedAt:{not:null}}},select:{id:true,name:true,branches:{where:{isActive:true,bookingEnabled:true},select:{id:true,name:true,city:true},orderBy:[{isMain:"desc"},{sortOrder:"asc"}]}}});
  if(!business || !await canBusinessUsePublicSlug(business.id,slug) || !await hasActiveBusinessSubscription({businessId:business.id}))notFound();
  return <main dir="rtl" className="min-h-screen bg-[#f3f8f7] px-4 py-8 text-[#173936]"><div className="mx-auto max-w-xl"><Link href={`/${slug}`} className="inline-flex min-h-11 items-center text-sm font-bold">العودة إلى {business.name}</Link><VisitorBookingManager slug={slug} businessName={business.name} branches={business.branches}/><p className="mt-6 text-center text-xs text-[#607772]">INFRO · انفرو</p></div></main>;
}
