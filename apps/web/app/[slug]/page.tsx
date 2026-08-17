import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getBusinessPublic } from "../actions/business";
import { PublicBusinessPageV10Compact } from "../../components/public-business-page-v10-compact";
import { getPublicBusinessUrlFromRequest, isValidPublicSlug, normalizePublicSlug } from "../lib/public-url";
import { isPreviewQaEnvironment } from "../lib/qa-audit";
import { resolveBusinessSlugAlias } from "../lib/slug-alias";

export const dynamic = "force-dynamic";
const getPublicBusinessForRequest = cache((slug: string) => getBusinessPublic(slug));
function makeQrUrl(url: string) { return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`; }
function safeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
function absolutePublicAssetUrl(value?: string | null) { const raw=String(value??"").trim(); if(!raw)return null; try{return new URL(raw,"https://hee.sa").toString();}catch{return null;} }
async function getBusinessOrAlias(slug:string){const direct=await getPublicBusinessForRequest(slug); if(direct)return {business:direct,isAlias:false} as const; const alias=await resolveBusinessSlugAlias(slug); if(!alias)return null; const business=await getPublicBusinessForRequest(alias.canonicalSlug); if(!business)return null; return {business,isAlias:true} as const;}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params; const normalizedSlug=normalizePublicSlug(slug); if(!normalizedSlug||!isValidPublicSlug(normalizedSlug)||normalizedSlug!==slug)return {};
 const resolved=await getBusinessOrAlias(normalizedSlug); const business=resolved?.business; if(!business||!business.isPublished)return {};
 const canonicalUrl=`https://hee.sa/${business.slug}`; const title=business.metaTitle||`${business.name} | HEE`; const description=business.metaDescription||business.description||`صفحة ${business.name}`; const socialImageUrl=absolutePublicAssetUrl(business.coverUrl)||absolutePublicAssetUrl(business.logoUrl);
 return {title:{absolute:title},description,alternates:{canonical:canonicalUrl},openGraph:{title,description,type:"website",url:canonicalUrl,siteName:"HEE",locale:"ar_SA",images:socialImageUrl?[{url:socialImageUrl,alt:business.name}]:undefined},twitter:{card:socialImageUrl?"summary_large_image":"summary",title,description,images:socialImageUrl?[socialImageUrl]:undefined},...(isPreviewQaEnvironment()?{robots:{index:false,follow:false}}:{robots:{index:true,follow:true}})};
}

export default async function PublicBusinessPageRoute({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const normalizedSlug=normalizePublicSlug(slug); if(!normalizedSlug||!isValidPublicSlug(normalizedSlug)||normalizedSlug!==slug)notFound();
 const resolved=await getBusinessOrAlias(normalizedSlug); if(!resolved||!resolved.business.isPublished)notFound(); if(resolved.isAlias)permanentRedirect(`/${resolved.business.slug}`);
 const business=resolved.business; const canonicalUrl=`https://hee.sa/${business.slug}`; const publicUrl=await getPublicBusinessUrlFromRequest(business.slug); const qrDataUrl=makeQrUrl(publicUrl);
 const socialUrls=[business.website,business.instagramUrl,business.tiktokUrl,business.snapchatUrl,business.xUrl,business.facebookUrl].filter((value):value is string=>Boolean(value)); const logoUrl=absolutePublicAssetUrl(business.logoUrl); const imageUrl=absolutePublicAssetUrl(business.coverUrl)||logoUrl;
 const structuredData={"@context":"https://schema.org","@type":"LocalBusiness","@id":`${canonicalUrl}#business`,name:business.name,...(business.nameEn?{alternateName:business.nameEn}:{}),url:canonicalUrl,...(business.description?{description:business.description}:{}),...(logoUrl?{logo:logoUrl}:{}),...(imageUrl?{image:imageUrl}:{}),...(business.phone?{telephone:business.phone}:{}),...(business.email?{email:business.email}:{}),...(business.address||business.city||business.district?{address:{"@type":"PostalAddress",...(business.address?{streetAddress:business.address}:{}),...(business.district?{addressLocality:business.district}:{}),...(business.city?{addressRegion:business.city}:{}),...(business.country?{addressCountry:business.country}:{addressCountry:"SA"})}}:{}),...(socialUrls.length?{sameAs:socialUrls}:{})};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(structuredData)}}/><PublicBusinessPageV10Compact business={business} qrDataUrl={qrDataUrl} publicUrl={publicUrl}/></>;
}
