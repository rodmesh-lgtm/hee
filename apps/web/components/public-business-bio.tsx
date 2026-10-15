"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, Building2, Clock3, FileText, Globe2, Mail, MapPin, MessageCircle, Phone, Share2, ShoppingBag, ArrowUpLeft, UsersRound } from "lucide-react";
import { IrMark } from "./brand/ir-logo";
import { identityAppearanceStyle } from "../app/lib/public-identity-appearance";
import { identityFontVariables } from "./public-identity-fonts";
import styles from "./public-business-bio.module.css";
import type { PageModuleState } from "../app/lib/page-modules";

type Service={id:string|number;name?:string|null;description?:string|null;isActive?:boolean|null;sortOrder?:number|null};
type Branch={id:string|number;name?:string|null;city?:string|null;district?:string|null;address?:string|null;googleMapsLink?:string|null;isActive?:boolean|null};
type Contact={id:string|number;name?:string|null;jobTitle?:string|null;imageUrl?:string|null;phone?:string|null;whatsapp?:string|null;email?:string|null;isActive?:boolean|null;department?:{name?:string|null}|null};
type GalleryItem={id:string|number;imageUrl?:string|null;title?:string|null;isActive?:boolean|null};
type Business={id:string|number;slug:string;name:string;nameEn?:string|null;description?:string|null;shortDescription?:string|null;businessCategory?:string|null;businessType?:string|null;city?:string|null;district?:string|null;address?:string|null;country?:string|null;phone?:string|null;whatsapp?:string|null;email?:string|null;website?:string|null;logoUrl?:string|null;coverUrl?:string|null;companyProfileUrl?:string|null;companyProfileTitle?:string|null;googleMapsLink?:string|null;workingHours?:string|null;openingHours?:unknown[];isVerified?:boolean|null;services?:Service[];branches?:Branch[];contactPersons?:Contact[];galleryItems?:GalleryItem[]};
type Props={business:Business;publicUrl:string;pageModules?:PageModuleState[];bookingRibbonAvailable?:boolean};
const clean=(v?:string|null)=>String(v??"").trim();
const digits=(v?:string|null)=>clean(v).replace(/\D/g,"");
const asset=(v?:string|null)=>{const x=clean(v);return !x?null:/^(https?:\/\/|data:|blob:|\/)/i.test(x)?x:`/${x.replace(/^\/+/g,"")}`};
const external=(v?:string|null)=>{const x=clean(v);if(!x)return null;try{return new URL(/^https?:\/\//i.test(x)?x:`https://${x}`).toString()}catch{return null}};

export function PublicBusinessBio({business,publicUrl,pageModules=[],bookingRibbonAvailable=false}:Props){
 const logo=asset(business.logoUrl),services=(business.services??[]).filter(x=>x.isActive!==false&&clean(x.name)).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)),branches=(business.branches??[]).filter(x=>x.isActive!==false&&clean(x.name)),gallery=(business.galleryItems??[]).filter(x=>x.isActive!==false&&asset(x.imageUrl)),contacts=(business.contactPersons??[]).filter(x=>x.isActive!==false&&clean(x.name));
 const [allServices,setAllServices]=useState(false),[allBranches,setAllBranches]=useState(false),[allGallery,setAllGallery]=useState(false);
 const groups=useMemo(()=>{const map=new Map<string,Contact[]>();for(const person of contacts){const key=clean(person.department?.name)||"فريق التواصل";map.set(key,[...(map.get(key)??[]),person])}return[...map.entries()]},[contacts]);
 const [activeDepartment,setActiveDepartment]=useState(groups[0]?.[0]??""),[copied,setCopied]=useState(false),[barVisible,setBarVisible]=useState(true);
 useEffect(()=>{let previous=window.scrollY;const onScroll=()=>{const current=window.scrollY;setBarVisible(current<previous||current<80);previous=current};window.addEventListener("scroll",onScroll,{passive:true});return()=>window.removeEventListener("scroll",onScroll)},[]);
 const moduleMap=new Map(pageModules.map(x=>[x.id,x])),config=(id:PageModuleState["id"])=>moduleMap.get(id)?.config,contactConfig=config("contact"),profile=config("companyProfile")?.companyProfile,storeUrl=external(config("externalStore")?.externalStoreUrl),website=external(contactConfig?.websiteUrl)||external(business.website),careersUrl=external(contactConfig?.careersExternalUrl),careersEmail=clean(contactConfig?.careersEmail),activePeople=groups.find(([name])=>name===activeDepartment)?.[1]??groups[0]?.[1]??[],summary=clean(business.shortDescription)||clean(business.description),hasCareers=Boolean(careersUrl||careersEmail),communicationCount=[digits(business.whatsapp),digits(business.phone),clean(business.email),website].filter(Boolean).length;
 const configuredActions=(contactConfig?.bottomActions??[]).slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
 type ActionItem={id:string;label:string;href:string;icon:typeof Phone;primary:boolean};
 const actionDefaults=[{id:"whatsapp",label:"واتساب"},{id:"phone",label:"اتصال"},{id:"email",label:"بريد"},{id:"website",label:"الموقع"},{id:"share",label:"مشاركة"}] as const;
 const sourceActions=configuredActions.length?configuredActions:actionDefaults.map((item,index)=>({...item,enabled:true,sortOrder:index}));
 const actionItems:ActionItem[]=sourceActions.flatMap((item):ActionItem[]=>{if(item.enabled===false)return [];if(item.id==="whatsapp"&&digits(business.whatsapp))return [{id:item.id,label:item.label||"واتساب",href:"https://wa.me/"+digits(business.whatsapp),icon:MessageCircle,primary:true}];if(item.id==="phone"&&digits(business.phone))return [{id:item.id,label:item.label||"اتصال",href:"tel:"+digits(business.phone),icon:Phone,primary:false}];if(item.id==="email"&&clean(business.email))return [{id:item.id,label:item.label||"بريد",href:"mailto:"+clean(business.email),icon:Mail,primary:false}];if(item.id==="website"&&website)return [{id:item.id,label:item.label||"الموقع",href:website,icon:Globe2,primary:false}];if(item.id==="share")return [{id:item.id,label:item.label||"مشاركة",href:"",icon:Share2,primary:false}];return [];});
 const sectionLinks:Array<{label:string;href:string}>=[];
 if(branches.length)sectionLinks.push({label:"الفروع",href:"#branches"});
 if(groups.length)sectionLinks.push({label:"الأقسام والتواصل",href:"#contact"});
 if(services.length)sectionLinks.push({label:"الخدمات",href:"#services"});
 if(gallery.length)sectionLinks.push({label:"معرض الأعمال",href:"#projects"});
 if(clean(business.workingHours))sectionLinks.push({label:"ساعات العمل",href:"#hours"});
 if(hasCareers)sectionLinks.push({label:"الوظائف",href:"#careers"});
 if(website||storeUrl)sectionLinks.push({label:"روابط المنشأة",href:"#destinations"});
 const sectionOrder=(...ids:PageModuleState["id"][])=>Math.min(...ids.map(id=>moduleMap.get(id)?.sortOrder??999));
 const trustFacts:Array<{label:string;icon:typeof BriefcaseBusiness;accent?:boolean}>=[];
 trustFacts.push({label:business.isVerified?"هوية موثقة":"هوية منشأة",icon:business.isVerified?BadgeCheck:Building2,accent:Boolean(business.isVerified)});
 if(branches.length)trustFacts.push({label:`${branches.length} ${branches.length===1?"فرع":"فروع"}`,icon:MapPin});
 if(communicationCount)trustFacts.push({label:`${communicationCount} ${communicationCount===1?"قناة تواصل":"قنوات تواصل"}`,icon:Phone});
 if(trustFacts.length<3&&services.length)trustFacts.push({label:`${services.length} ${services.length===1?"خدمة":"خدمات"}`,icon:BriefcaseBusiness});
 async function share(){if(navigator.share){try{await navigator.share({title:business.name,url:publicUrl});return}catch{}}try{await navigator.clipboard.writeText(publicUrl);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{}}
 return <main data-public-page dir="rtl" className={`${styles.page} ${identityFontVariables}`} style={identityAppearanceStyle(contactConfig?.appearance)}>
  <div className={styles.shell}>
   <div className={styles.brandDock}><Link href="/" data-infro-customer-header aria-label="INFRO" className={styles.brand}><IrMark className="h-9" priority/></Link></div>
   <div className={styles.topbar}>
    <button type="button" onClick={()=>void share()} aria-label="مشاركة الصفحة" className={styles.share}><Share2 aria-hidden="true" size={18}/></button>
    <span className={styles.eyebrow}>هوية أعمال رقمية</span>
    <span className={styles.brandPlaceholder} aria-hidden="true"/>
   </div>
   <header className={styles.hero}>
    <div className={styles.logo}><span>{logo?<img src={logo} alt={`شعار ${business.name}`}/>:<Building2 size={40}/>}</span>{business.isVerified?<BadgeCheck aria-label="منشأة موثقة" className={styles.verified}/>:null}</div>
    <h1>{business.name}</h1>
    {summary?<p className={styles.summary}>{summary}</p>:null}
    <span className={styles.heroRule} aria-hidden="true"/>
   </header>
   <div className={styles.identityDetails}>
    <div data-public-profile-slot/>
    <div data-public-social-slot/>
   </div>
   {sectionLinks.length?<nav aria-label="أقسام صفحة المنشأة" className={styles.nav}>{sectionLinks.map(item=><a key={item.href} href={item.href}>{item.label}<ArrowUpLeft size={14} aria-hidden="true"/></a>)}</nav>:null}
   <div className={styles.sections}>
    <section data-public-module="request" aria-labelledby="intent-title" id={!groups.length?"contact":undefined} className={styles.request} style={{order:sectionOrder("request")}}>
     <div className={styles.requestHeading}><span className={styles.requestIcon}><MessageCircle size={24} aria-hidden="true"/></span><div><span className={styles.eyebrow}>نرحّب بتواصلك</span><h2 id="intent-title">كيف نقدر نخدمك اليوم؟</h2><p>كل ما تحتاجه للتواصل معنا، في مكان واحد.</p></div></div>
     <div data-public-transactions-slot/>
     <div className={styles.contactLinks}>{digits(business.whatsapp)?<a href={`https://wa.me/${digits(business.whatsapp)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true"/>تواصل عبر واتساب<ArrowUpLeft size={15} aria-hidden="true"/></a>:null}{digits(business.phone)?<a href={`tel:${digits(business.phone)}`}><Phone size={17} aria-hidden="true"/>اتصل بنا</a>:null}{clean(business.email)?<a href={`mailto:${clean(business.email)}`}><Mail size={17} aria-hidden="true"/>راسلنا بالبريد</a>:null}</div>
    </section>
    {branches.length?<section data-public-module="location" id="branches" className={styles.section} style={{order:sectionOrder("location")}}>
     <SectionHeading eyebrow="نسعد بزيارتك" title="فروعنا" count={branches.length}/>
     <div id="branch-list" className={styles.branchGrid}>{branches.slice(0,allBranches?undefined:6).map(branch=><a key={String(branch.id)} href={external(branch.googleMapsLink)||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([branch.name,branch.city,branch.address].filter(Boolean).join(" "))}`} target="_blank" rel="noreferrer" className={styles.branch}>
      <span className={styles.branchIcon}><MapPin size={19} aria-hidden="true"/></span>
      <div className={styles.branchDetails}><h3>{clean(branch.name)}</h3>{[branch.city,branch.district,branch.address].some(value=>clean(value))?<p>{[branch.city,branch.district,branch.address].map(value=>clean(value)).filter(Boolean).join("، ")}</p>:null}</div>
      <span className={styles.branchDirection}><ArrowUpLeft size={18} aria-hidden="true"/><span>الاتجاهات على الخريطة</span></span>
     </a>)}</div>{branches.length>6?<ExpandList expanded={allBranches} onToggle={()=>setAllBranches(value=>!value)} count={branches.length} label="الفروع" controls="branch-list"/>:null}
    </section>:null}
    {groups.length?<section data-public-module="contactTeam" id="contact" className={styles.section} style={{order:sectionOrder("contactTeam")}}>
     <SectionHeading eyebrow="فريق التواصل" title="اختر القسم وسنوصلك بالشخص المناسب"/>
     <div className={styles.departments}>{groups.map(([name])=><button key={name} type="button" onClick={()=>setActiveDepartment(name)} aria-pressed={activeDepartment===name}>{name}</button>)}</div>
     <div className={styles.people}>{activePeople.map(person=><Person key={String(person.id)} person={person}/>)}</div>
    </section>:null}
    {trustFacts.length?<section data-public-module="about" aria-label="معلومات عن المنشأة" className={styles.facts} style={{order:sectionOrder("about"),gridTemplateColumns:`repeat(${Math.min(trustFacts.length,3)},minmax(0,1fr))`}}>{trustFacts.slice(0,3).map(({label,icon:Icon})=><span key={label}><Icon size={20} aria-hidden="true"/><b>{label}</b></span>)}</section>:null}
    {services.length||gallery.length?<section data-public-module="services" id="highlights" className={styles.section} style={{order:sectionOrder("services","portfolio")}}>
     {services.length?<><SectionHeading eyebrow="خبراتنا بين يديك" title="أبرز ما نقدمه" count={services.length}/><div id="services" className={styles.serviceGrid}>{services.slice(0,allServices?undefined:6).map((service,index)=><article key={String(service.id)} className={styles.service}>
      <div className={styles.cardTop}><span className={styles.iconTile}><BriefcaseBusiness size={22} aria-hidden="true"/></span><span className={styles.index} aria-hidden="true">{String(index+1).padStart(2,"0")}</span></div>
      <h3>{clean(service.name)}</h3>{clean(service.description)?<p>{clean(service.description)}</p>:null}
     </article>)}</div>{services.length>6?<ExpandList expanded={allServices} onToggle={()=>setAllServices(value=>!value)} count={services.length} label="الخدمات" controls="services"/>:null}</>:null}
     {gallery.length?<div id="projects" className={styles.gallerySection}><SectionHeading eyebrow="من أعمالنا" title="معرض الأعمال" count={gallery.length}/><div id="gallery-list" className={styles.gallery}>{gallery.slice(0,allGallery?undefined:6).map(item=><a key={String(item.id)} href={asset(item.imageUrl)!} target="_blank" rel="noreferrer" aria-label={`عرض ${clean(item.title)||"صورة من أعمال المنشأة"}`}><figure><img src={asset(item.imageUrl)!} alt={clean(item.title)||"من أعمال المنشأة"} loading="lazy"/>{clean(item.title)?<figcaption>{clean(item.title)}<ArrowUpLeft size={17} aria-hidden="true"/></figcaption>:null}</figure></a>)}</div>{gallery.length>6?<ExpandList expanded={allGallery} onToggle={()=>setAllGallery(value=>!value)} count={gallery.length} label="الأعمال" controls="gallery-list"/>:null}</div>:null}
    </section>:null}
    <section data-public-module="contact" id="destinations" aria-label="روابط المنشأة" className={styles.destinations} style={{order:sectionOrder("contact")}}>{!business.companyProfileUrl&&profile?.visible!==false&&profile?.pdfUrl?<Destination icon={FileText} title={profile.title||"ملف الشركة"} href={profile.pdfUrl}/>:null}{storeUrl?<Destination icon={ShoppingBag} title="المتجر" href={storeUrl}/>:null}{website?<Destination icon={Globe2} title={contactConfig?.websiteType==="ONLINE_STORE"?"المتجر الإلكتروني":"الموقع الإلكتروني"} href={website}/>:null}{(business.googleMapsLink||branches[0])?<Destination icon={MapPin} title="خرائط Google" href={external(business.googleMapsLink)||external(branches[0]?.googleMapsLink)||"#branches"}/>:null}</section>
    {clean(business.workingHours)?<section data-public-module="hours" id="hours" className={styles.hours} style={{order:sectionOrder("hours")}}><span className={styles.iconTile}><Clock3 size={23} aria-hidden="true"/></span><div><h2>ساعات العمل</h2><p>{clean(business.workingHours)}</p></div></section>:null}
    {hasCareers?<section data-public-module="contact" id="careers" className={styles.careers} style={{order:sectionOrder("contact")}}><div><span className={styles.eyebrow}>انضم إلينا</span><h2>أحدث الفرص الوظيفية</h2><p>تعرّف على الوظائف المتاحة وشاركنا خبرتك.</p></div><a href={careersUrl||`mailto:${careersEmail}`}>استعرض الفرص<ArrowUpLeft size={18} aria-hidden="true"/></a></section>:null}
   </div>
   <footer data-infro-customer-footer className={styles.footer}><div><IrMark className="h-7"/><b>INFRO</b></div><span>هوية أعمال رقمية · ir.sa</span></footer>
   {actionItems.length||bookingRibbonAvailable?<div data-public-action-ribbon style={{bottom:"max(.75rem, env(safe-area-inset-bottom))"}} className={`${styles.ribbon} ${barVisible?"":styles.ribbonHidden}`}>{bookingRibbonAvailable?<div data-public-booking-ribbon-slot className="min-w-0 flex-1"/>:null}{actionItems.map(item=>item.id==="share"?<button key={item.id} type="button" onClick={()=>void share()} aria-label="مشاركة"><Share2 size={18}/></button>:<QuickAction key={item.id} icon={item.icon} label={item.label} href={item.href} primary={item.primary}/>)}</div>:null}
   {copied?<div role="status" className={styles.toast}>تم نسخ الرابط</div>:null}
  </div>
 </main>
}
function ExpandList({expanded,onToggle,count,label,controls}:{expanded:boolean;onToggle:()=>void;count:number;label:string;controls:string}){return <button type="button" className={styles.expandList} aria-expanded={expanded} aria-controls={controls} onClick={onToggle}>{expanded?`عرض أقل من ${label}`:`عرض كل ${label} (${count.toLocaleString("ar-SA")})`}<ArrowUpLeft size={16} aria-hidden="true"/></button>}
function SectionHeading({eyebrow,title,count}:{eyebrow:string;title:string;count?:number}){return <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>{eyebrow}</span><h2>{title}</h2></div>{count?<span className={styles.count}>{count.toLocaleString("ar-SA")}</span>:null}</div>}
function Person({person}:{person:Contact}){const phone=digits(person.phone),whatsapp=digits(person.whatsapp),email=clean(person.email),photo=asset(person.imageUrl);return <article className={styles.person}><span className={styles.avatar}>{photo?<img src={photo} alt="" loading="lazy"/>:<UsersRound size={24} aria-hidden="true"/>}</span><span className={styles.personName}><b>{clean(person.name)}</b><small>{clean(person.jobTitle)||"ممثل المنشأة"}</small></span><span className={styles.personActions}>{whatsapp?<MiniAction label={`واتساب ${person.name}`} href={`https://wa.me/${whatsapp}`} icon={MessageCircle}/>:null}{phone?<MiniAction label={`اتصال ${person.name}`} href={`tel:${phone}`} icon={Phone}/>:null}{email?<MiniAction label={`بريد ${person.name}`} href={`mailto:${email}`} icon={Mail}/>:null}</span></article>}
function MiniAction({label,href,icon:Icon}:{label:string;href:string;icon:typeof Phone}){return <a aria-label={label} href={href}><Icon size={18} aria-hidden="true"/></a>}
function Destination({icon:Icon,title,href}:{icon:typeof Globe2;title:string;href:string}){const isHttp=href.startsWith("http");return <a href={href} target={isHttp?"_blank":undefined} rel={isHttp?"noreferrer":undefined}><span className={styles.iconTile}><Icon size={22} aria-hidden="true"/></span><b>{title}</b><ArrowUpLeft size={18} aria-hidden="true"/></a>}
function QuickAction({icon:Icon,label,href,primary=false}:{icon:typeof Phone;label:string;href:string;primary?:boolean}){return <a href={href} target={href.startsWith("http")?"_blank":undefined} rel={href.startsWith("http")?"noreferrer":undefined} className={primary?styles.primaryAction:undefined}><Icon size={18} aria-hidden="true"/><span>{label}</span></a>}
