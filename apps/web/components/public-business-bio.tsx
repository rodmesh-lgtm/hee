"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, Building2, ChevronLeft, Clock3, FileText, Globe2, Images, Mail, MapPin, MessageCircle, Phone, Share2, ShoppingBag, ArrowUpLeft, UsersRound } from "lucide-react";
import { IrMark } from "./brand/ir-logo";
import type { PageModuleState } from "../app/lib/page-modules";

type Service={id:string|number;name?:string|null;description?:string|null;isActive?:boolean|null;sortOrder?:number|null};
type Branch={id:string|number;name?:string|null;city?:string|null;district?:string|null;address?:string|null;googleMapsLink?:string|null;isActive?:boolean|null};
type Contact={id:string|number;name?:string|null;jobTitle?:string|null;imageUrl?:string|null;phone?:string|null;whatsapp?:string|null;email?:string|null;isActive?:boolean|null;department?:{name?:string|null}|null};
type GalleryItem={id:string|number;imageUrl?:string|null;title?:string|null;isActive?:boolean|null};
type Business={id:string|number;slug:string;name:string;nameEn?:string|null;description?:string|null;shortDescription?:string|null;businessCategory?:string|null;businessType?:string|null;city?:string|null;district?:string|null;address?:string|null;country?:string|null;phone?:string|null;whatsapp?:string|null;email?:string|null;website?:string|null;logoUrl?:string|null;coverUrl?:string|null;companyProfileUrl?:string|null;companyProfileTitle?:string|null;googleMapsLink?:string|null;workingHours?:string|null;openingHours?:unknown[];isVerified?:boolean|null;services?:Service[];branches?:Branch[];contactPersons?:Contact[];galleryItems?:GalleryItem[]};
type Props={business:Business;publicUrl:string;pageModules?:PageModuleState[]};
const clean=(v?:string|null)=>String(v??"").trim();
const digits=(v?:string|null)=>clean(v).replace(/\D/g,"");
const asset=(v?:string|null)=>{const x=clean(v);return !x?null:/^(https?:\/\/|data:|blob:|\/)/i.test(x)?x:`/${x.replace(/^\/+/g,"")}`};
const external=(v?:string|null)=>{const x=clean(v);if(!x)return null;try{return new URL(/^https?:\/\//i.test(x)?x:`https://${x}`).toString()}catch{return null}};
function activityIntents(value?:string|null){
 const v=clean(value).toLowerCase();
 if(/مطعم|مقهى|ضياف|فندق|تموين/.test(v))return["استعرض القائمة","احجز أو اطلب","أقرب فرع","خدمة العملاء"];
 if(/صحة|طب|عياد|مستوصف|أسنان|صيدل/.test(v))return["احجز موعد","الخدمات الطبية","خدمة المرضى","أقرب فرع"];
 if(/تعليم|تدريب|مدرس|أكاديم|جامعة/.test(v))return["البرامج والخدمات","التسجيل","القبول والاستفسارات","الفروع"];
 if(/عقار|تطوير عقاري|وساطة/.test(v))return["استعرض المشاريع","اطلب استشارة","التحدث مع المبيعات","الفروع"];
 if(/مقاول|صيانة|ورشة|هندس|تشغيل/.test(v))return["اطلب عرض سعر","احجز خدمة","تواصل مع المبيعات","أقرب فرع"];
 if(/نقل|شحن|لوجست|توصيل/.test(v))return["اطلب خدمة","تابع شحنة","تواصل مع العمليات","أقرب فرع"];
 if(/متجر|تجزئة|بيع|تجارة إلكترونية/.test(v))return["تسوّق الآن","اسأل عن منتج","خدمة العملاء","أقرب فرع"];
 if(/تقنية|برمج|استشار|محاسب|قانون|تسويق/.test(v))return["اطلب استشارة","استعرض الخدمات","التحدث مع المختص","التوظيف"];
 return["طلب عرض سعر","استعرض الخدمات","التحدث مع المبيعات","التوظيف"];
}

export function PublicBusinessBio({business,publicUrl,pageModules=[]}:Props){
 const logo=asset(business.logoUrl),services=(business.services??[]).filter(x=>x.isActive!==false&&clean(x.name)).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)).slice(0,6),branches=(business.branches??[]).filter(x=>x.isActive!==false&&clean(x.name)).slice(0,6),gallery=(business.galleryItems??[]).filter(x=>x.isActive!==false&&asset(x.imageUrl)).slice(0,6),contacts=(business.contactPersons??[]).filter(x=>x.isActive!==false&&clean(x.name));
 const groups=useMemo(()=>{const map=new Map<string,Contact[]>();for(const person of contacts){const key=clean(person.department?.name)||"فريق التواصل";map.set(key,[...(map.get(key)??[]),person])}return[...map.entries()]},[contacts]);
 const [activeDepartment,setActiveDepartment]=useState(groups[0]?.[0]??""),[copied,setCopied]=useState(false),[barVisible,setBarVisible]=useState(true);
 useEffect(()=>{let previous=window.scrollY;const onScroll=()=>{const current=window.scrollY;setBarVisible(current<previous||current<80);previous=current};window.addEventListener("scroll",onScroll,{passive:true});return()=>window.removeEventListener("scroll",onScroll)},[]);
 const moduleMap=new Map(pageModules.map(x=>[x.id,x])),config=(id:PageModuleState["id"])=>moduleMap.get(id)?.config,contactConfig=config("contact"),profile=config("companyProfile")?.companyProfile,storeUrl=external(config("externalStore")?.externalStoreUrl),website=external(contactConfig?.websiteUrl)||external(business.website),careersUrl=external(contactConfig?.careersExternalUrl),careersEmail=clean(contactConfig?.careersEmail),activePeople=groups.find(([name])=>name===activeDepartment)?.[1]??groups[0]?.[1]??[],intents=activityIntents(business.businessType||business.businessCategory),summary=clean(business.shortDescription)||clean(business.description),hasCareers=Boolean(careersUrl||careersEmail),communicationCount=[digits(business.whatsapp),digits(business.phone),clean(business.email),website].filter(Boolean).length;
 type ActionItem={id:string;label:string;href:string;icon:typeof Phone;primary:boolean};
 const configuredActions=(contactConfig?.bottomActions??[]).slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
 const actionDefaults=[{id:"whatsapp",label:"واتساب"},{id:"phone",label:"اتصال"},{id:"email",label:"بريد"},{id:"website",label:"الموقع"},{id:"share",label:"مشاركة"}] as const;
 const sourceActions=configuredActions.length?configuredActions:actionDefaults.map((item,index)=>({...item,enabled:true,sortOrder:index}));
 const actionItems:ActionItem[]=sourceActions.flatMap((item):ActionItem[]=>{if(item.enabled===false)return [];if(item.id==="whatsapp"&&digits(business.whatsapp))return [{id:item.id,label:item.label||"واتساب",href:`https://wa.me/${digits(business.whatsapp)}`,icon:MessageCircle,primary:true}];if(item.id==="phone"&&digits(business.phone))return [{id:item.id,label:item.label||"اتصال",href:`tel:${digits(business.phone)}`,icon:Phone,primary:false}];if(item.id==="email"&&clean(business.email))return [{id:item.id,label:item.label||"بريد",href:`mailto:${clean(business.email)}`,icon:Mail,primary:false}];if(item.id==="website"&&website)return [{id:item.id,label:item.label||"الموقع",href:website,icon:Globe2,primary:false}];if(item.id==="share")return [{id:item.id,label:item.label||"مشاركة",href:"",icon:Share2,primary:false}];return [];});

