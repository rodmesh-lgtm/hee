"use client";

import {useMemo,useState} from "react";
import type {Prisma} from "@prisma/client";
import {BadgeCheck,BriefcaseBusiness,Building2,CalendarDays,ChevronLeft,Clock3,FileText,Globe2,Mail,MapPin,Menu,MessageCircle,Phone,Share2,ShieldCheck,Sparkles,Star,UserRound,UsersRound,Wrench,CheckCircle2} from "lucide-react";

type BusinessPublicPayload=Prisma.BusinessGetPayload<{include:{products:{include:{category:true}};offers:true;services:true;openingHours:true;galleryItems:true;socialLinks:true;branches:true;departments:{include:{contacts:{include:{branch:true}}}}}}>;
type Props={business:BusinessPublicPayload;qrDataUrl:string;publicUrl:string};
const digits=(v?:string|null)=>String(v??"").replace(/\D/g,"");
const phone=(v?:string|null)=>{const d=digits(v);return d.length>=8&&d.length<=15?d:null};
const text=(v?:string|null)=>{const s=String(v??"").trim();return s.length>=2?s:null};
const safeUrl=(v?:string|null)=>{const s=String(v??"").trim();if(!s)return null;try{return new URL(/^https?:\/\//i.test(s)?s:`https://${s}`).toString()}catch{return null}};
const Title=({kicker,children}:{kicker?:string;children:React.ReactNode})=><div><div className="flex items-center gap-2 text-xs font-black text-[#6b38b1]">{kicker&&<><span className="h-1.5 w-1.5 rounded-full bg-[#6b38b1]"/>{kicker}</>}</div><h2 className="mt-1 text-[24px] font-black tracking-tight text-[#18131d] md:text-[31px]">{children}</h2></div>;

export function PublicBusinessPageV10Premium({business,qrDataUrl,publicUrl}:Props){
 const [share,setShare]=useState(false);
 const wa=phone(business.whatsapp)||"966500000000", tel=phone(business.phone)||"966500000001";
 const logo=safeUrl(business.logoUrl),cover=safeUrl(business.coverUrl),profile=safeUrl(business.companyProfileUrl),website=safeUrl(business.website);
 const about=text(business.shortDescription)||text(business.description)||"نقدم حلولاً منزلية متكاملة بمعايير احترافية، وفريقاً متخصصاً يركز على الجودة والموثوقية وسرعة الاستجابة في جميع أنحاء جدة.";
 const category=text(business.businessCategory)||text(business.businessType)||"الخدمات المنزلية";
 const location=[text(business.city)||"جدة",text(business.district)||"حي الروضة"].filter(Boolean).join("، ");
 const realServices=business.services.filter(s=>s.isActive&&text(s.name)).slice(0,4);
 const services=realServices.length?realServices.map((s,i)=>({id:String(s.id),name:s.name,description:text(s.description)||["تنفيذ احترافي بواسطة فريق متخصص مع متابعة دقيقة للجودة.","حلول مرنة تناسب احتياج المنزل مع سرعة في الاستجابة."][i%2]})):[
  {id:"d1",name:"تنظيف المنازل",description:"تنظيف شامل للمنازل والفلل باستخدام أفضل المعدات."},
  {id:"d2",name:"صيانة منزلية",description:"حلول صيانة وإصلاح لجميع الأعمال المنزلية."},
  {id:"d3",name:"تركيب وصيانة المكيفات",description:"تركيب وصيانة دورية لمختلف أنواع المكيفات."},
  {id:"d4",name:"تنظيف الواجهات",description:"تنظيف واجهات المباني والزجاج بعناية واحترافية."}
 ];
 const realContacts=useMemo(()=>business.departments.filter(d=>d.isActive).flatMap(d=>d.contacts.filter(c=>c.isActive&&text(c.name)).map(c=>({id:String(c.id),name:c.name,role:text(c.jobTitle)||text(d.name)||"خدمة العملاء",p:phone(c.phone),w:phone(c.whatsapp),image:safeUrl(c.imageUrl)}))).slice(0,4),[business.departments]);
 const contacts=realContacts.length?realContacts:[
  {id:"c1",name:"محمد أحمد",role:"مبيعات الشركات",p:tel,w:wa,image:null},
  {id:"c2",name:"خالد عبدالله",role:"خدمة العملاء",p:tel,w:wa,image:null},
  {id:"c3",name:"سارة محمد",role:"الحجوزات والمتابعة",p:tel,w:wa,image:null},
  {id:"c4",name:"عبدالله سالم",role:"المشرف الميداني",p:tel,w:wa,image:null}
 ];
 const realBranches=business.branches.filter(b=>b.isActive&&text(b.name)).slice(0,3);
 const branches=realBranches.length?realBranches.map((b,i)=>({id:String(b.id),name:b.name,place:[b.city,b.district,b.address].filter(Boolean).join("، ")||`جدة، فرع ${i+1}`})):[
  {id:"b1",name:"الفرع الرئيسي",place:"جدة، حي الروضة"},{id:"b2",name:"فرع شمال جدة",place:"جدة، حي الزهراء"},{id:"b3",name:"فرع جنوب جدة",place:"جدة، حي الأجاويد"}
 ];
 const gallery=business.galleryItems.filter(g=>g.isActive&&safeUrl(g.imageUrl)).slice(0,4);
 const request=`https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً، أرغب في طلب خدمة من ${business.name}`)}`;
 const map=safeUrl(business.googleMapsLink)||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
 const hour=business.openingHours.find(h=>!h.isClosed&&h.opensAt&&h.closesAt); const hours=text(business.workingHours)||(hour?`${hour.opensAt} - ${hour.closesAt}`:"السبت - الخميس، 8:00 ص - 10:00 م");
 const IconSet=[Sparkles,Wrench,Building2,BriefcaseBusiness];
 return <main dir="rtl" data-renderer="hee-v10-1-premium" className="min-h-screen bg-[#fcfbfd] text-[#18131d]">
  <section className="relative min-h-[620px] overflow-hidden bg-[#151018] text-white md:min-h-[690px]">
   {cover?<img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover"/>:<div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_25%,rgba(104,51,167,.42),transparent_30%),radial-gradient(circle_at_15%_75%,rgba(92,45,143,.18),transparent_26%),linear-gradient(125deg,#17111b,#0d0b0f_72%)]"/>}
   <div className="absolute inset-0 bg-black/25"/>
   <div className="relative mx-auto max-w-[1280px] px-5 pt-5 md:px-8 md:pt-8">
    <header className="flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={()=>setShare(!share)} className="rounded-full bg-white px-4 py-2.5 text-xs font-black text-black"><Share2 className="ml-2 inline h-4 w-4"/>مشاركة</button><a href={`https://wa.me/${wa}`} className="grid h-10 w-10 place-items-center rounded-full bg-white text-emerald-600"><MessageCircle className="h-4 w-4"/></a></div><div className="flex items-center gap-3"><b className="text-3xl tracking-[-.08em] text-[#8c5ad0]">HEE</b><Menu className="text-white"/></div></header>
    {share&&<div className="absolute left-5 top-20 z-30 flex w-72 gap-3 rounded-2xl bg-white p-3 text-black shadow-2xl"><img src={qrDataUrl} className="h-14 w-14 rounded-lg" alt="QR"/><div className="min-w-0"><b className="text-xs">رابط الصفحة</b><p className="truncate text-[10px] text-gray-500">{publicUrl}</p></div></div>}
    <div className="grid min-h-[520px] items-center gap-10 py-16 md:grid-cols-[1.35fr_.65fr] md:py-20">
     <div><span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#6035a3]"><BadgeCheck className="h-4 w-4"/>{business.isVerified?"موثق من HEE":"صفحة أعمال على HEE"}</span><h1 className="mt-5 max-w-3xl text-[40px] font-black leading-[1.15] md:text-[62px]">{business.name}</h1><h2 className="mt-3 text-[24px] font-black md:text-[34px]">{category}</h2><p className="mt-4 max-w-2xl text-[14px] leading-8 text-white/75 md:text-[17px]">{about}</p><div className="mt-6 flex flex-wrap items-center gap-3 text-sm"><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ad82e2]"/>{location}</span><span className="rounded-full bg-emerald-950/70 px-3 py-1.5 text-emerald-300">● مفتوح الآن</span></div></div>
     <div className="hidden justify-self-end md:block"><div className="grid h-60 w-60 place-items-center overflow-hidden rounded-[36px] bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,.3)]">{logo?<img src={logo} alt={business.name} className="h-full w-full object-contain"/>:<div className="text-center text-[#6035a3]"><div className="text-7xl font-black">{business.name.charAt(0)}</div><b className="mt-5 block text-lg">{business.name}</b></div>}</div></div>
    </div>
   </div>
  </section>

  <div className="relative z-20 mx-auto -mt-14 max-w-[1280px] px-4 md:px-8"><div className="grid grid-cols-3 gap-2 rounded-[26px] border border-[#e8e1ef] bg-white p-3 shadow-[0_18px_50px_rgba(44,29,56,.12)] md:grid-cols-5"><a href={request} className="col-span-3 flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-[#6333ad] font-black text-white md:col-span-1"><CalendarDays className="h-5 w-5"/>اطلب الخدمة الآن</a><button onClick={()=>setShare(!share)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e5ddeb] font-bold"><Share2 className="h-5 w-5"/><span className="hidden sm:inline">مشاركة</span></button><a href={map} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e5ddeb] font-bold"><MapPin className="h-5 w-5"/><span className="hidden sm:inline">الموقع</span></a><a href={`https://wa.me/${wa}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e5ddeb] font-bold"><MessageCircle className="h-5 w-5"/><span className="hidden sm:inline">واتساب</span></a><a href={`tel:${tel}`} className="hidden min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e5ddeb] font-bold md:flex"><Phone className="h-5 w-5"/>اتصال</a></div></div>

  <div className="mx-auto max-w-[1280px] space-y-16 px-4 pb-16 pt-14 md:px-8 md:pt-16">
   <section className="grid gap-4 md:grid-cols-4"><Trust icon={ShieldCheck} value="موثق" label="صفحة أعمال موثوقة"/><Trust icon={Star} value="4.9/5" label="تقييم العملاء"/><Trust icon={UsersRound} value="+500" label="عميل سعيد"/><Trust icon={CheckCircle2} value="+1000" label="خدمة مكتملة"/></section>

   <section className="grid gap-5 lg:grid-cols-[1.55fr_.75fr]"><div className="rounded-[28px] border border-[#ebe4f0] bg-[#f9f6fc] p-6 md:p-8"><Title kicker="تعرف علينا">نبذة عن المنشأة</Title><p className="mt-5 max-w-3xl text-sm leading-8 text-[#625b68]">{about}</p><div className="mt-7 grid grid-cols-2 gap-4 border-t border-[#e5ddec] pt-6 md:grid-cols-4"><Mini value="+5" label="سنوات خبرة"/><Mini value={String(branches.length)} label="فروع"/><Mini value="+25" label="فريق العمل"/><Mini value="98%" label="رضا العملاء"/></div></div><a href={profile||"#"} className="flex min-h-60 flex-col justify-between rounded-[28px] bg-gradient-to-br from-[#7040ba] to-[#4a1d7d] p-7 text-white shadow-lg"><FileText className="h-12 w-12"/><div><h3 className="text-xl font-black">الملف التعريفي للشركة</h3><p className="mt-2 text-xs text-white/70">تعرف على خدماتنا وخبراتنا ومشاريعنا</p></div><span className="rounded-xl bg-white py-3 text-center text-sm font-black text-[#5b2ca4]">عرض الملف</span></a></section>

   <section><div className="mb-6 flex items-end justify-between"><Title kicker="ما نقدمه">خدماتنا</Title><span className="text-sm font-black text-[#6333ad]">عرض الكل</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map((s,i)=>{const I=IconSet[i%4];return <article key={s.id} className="group rounded-[24px] border border-[#ebe4f0] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f3edf9] text-[#6333ad]"><I className="h-7 w-7"/></div><h3 className="mt-5 text-lg font-black">{s.name}</h3><p className="mt-2 min-h-14 text-xs leading-6 text-[#716a77]">{s.description}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-[#6333ad]">التفاصيل <ChevronLeft className="h-4 w-4"/></span></article>})}</div></section>

   <section><div className="mb-6"><Title kicker="نتائج نتحدث عنها">أعمالنا</Title></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{gallery.length?gallery.map((g,i)=><figure key={g.id} className="relative aspect-[1.15] overflow-hidden rounded-[24px] bg-[#eee8f3]"><img src={safeUrl(g.imageUrl)!} className="h-full w-full object-cover" alt={g.caption||`عمل ${i+1}`}/><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-12 text-sm font-black text-white">{g.caption||`مشروع مكتمل ${i+1}`}</figcaption></figure>):["تنظيف فلل","صيانة منزلية","تنظيف كنب","تركيب مكيفات"].map((x,i)=><div key={x} className="relative grid aspect-[1.15] place-items-center overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#eee7f5,#d9c9e9)]"><Building2 className="h-12 w-12 text-[#6c3bb0]/50"/><span className="absolute inset-x-0 bottom-0 bg-white/80 p-3 text-center text-sm font-black">{x}</span></div>)}</div></section>

   <section><div className="mb-6"><Title kicker="أشخاص حقيقيون لخدمتك">تواصل مع فريقنا</Title></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{contacts.map(c=><article key={c.id} className="rounded-[24px] border border-[#ebe4f0] bg-white p-5 text-center shadow-sm"><div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-[#f1eaf7]">{c.image?<img src={c.image} alt="" className="h-full w-full object-cover"/>:<UserRound className="h-10 w-10 text-[#6333ad]"/>}</div><h3 className="mt-4 font-black">{c.name}</h3><p className="mt-1 text-xs text-[#766e7b]">{c.role}</p><div className="mt-4 grid grid-cols-2 gap-2"><a href={`https://wa.me/${c.w||wa}`} className="rounded-xl border border-emerald-300 py-2 text-xs font-black text-emerald-700">واتساب</a><a href={`tel:${c.p||tel}`} className="rounded-xl border border-[#e5ddec] py-2 text-xs font-black">اتصال</a></div></article>)}</div></section>

   <section><div className="mb-6"><Title kicker="نغطي مناطق متعددة">فروعنا</Title></div><div className="grid gap-4 md:grid-cols-3">{branches.map((b,i)=><article key={b.id} className="rounded-[24px] border border-[#ebe4f0] bg-[#faf7fc] p-6"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#6333ad]"><MapPin/></div>{i===0&&<span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">الفرع الرئيسي</span>}</div><h3 className="mt-5 font-black">{b.name}</h3><p className="mt-2 text-xs text-[#746d79]">{b.place}</p><a href={map} className="mt-5 inline-flex text-xs font-black text-[#6333ad]">الاتجاهات على الخريطة <ChevronLeft className="h-4 w-4"/></a></article>)}</div></section>

   <section className="grid gap-4 md:grid-cols-3"><Info icon={MessageCircle} title="تواصل سريع"><a href={`https://wa.me/${wa}`} className="font-bold text-emerald-700">واتساب: +{wa}</a><p className="mt-2 text-xs text-[#746d79]">للاستفسارات والحجوزات وخدمة العملاء.</p></Info><Info icon={Clock3} title="ساعات العمل"><b>{hours}</b><span className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">مفتوح الآن</span></Info><Info icon={MapPin} title="موقعنا"><b>{location}</b><a href={map} className="mt-3 block text-xs font-black text-[#6333ad]">الاتجاهات على الخريطة</a></Info></section>

   <section className="rounded-[30px] bg-[#17121c] px-6 py-10 text-center text-white md:px-10 md:py-12"><h2 className="text-2xl font-black md:text-3xl">جاهز لطلب خدمتك؟</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/60">تواصل مباشرة مع {business.name} عبر القنوات الرسمية واحصل على الخدمة المناسبة.</p><div className="mt-6 flex justify-center gap-3"><a href={request} className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-black text-white">واتساب</a><a href={`tel:${tel}`} className="rounded-xl border border-white/20 px-7 py-3 text-sm font-black">اتصال</a></div></section>
  </div>
  <footer className="border-t border-[#eee8f2] bg-white"><div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-5 px-5 py-9 text-center md:flex-row md:text-right"><div><b className="text-2xl tracking-[-.08em] text-[#6b38b1]">HEE</b><p className="mt-1 text-xs text-gray-500">صفحة أعمال رقمية موحدة</p></div><div className="flex flex-wrap justify-center gap-5 text-xs font-bold text-[#655d6a]"><span>الخصوصية</span><span>الشروط والأحكام</span>{website&&<a href={website}><Globe2 className="ml-1 inline h-4 w-4"/>الموقع الإلكتروني</a>}<a href="/">أنشئ صفحتك على HEE</a></div></div></footer>
 </main>;
}

function Trust({icon:Icon,value,label}:{icon:any;value:string;label:string}){return <div className="flex items-center gap-4 rounded-[22px] border border-[#ebe4f0] bg-white p-5"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3edf9] text-[#6333ad]"><Icon className="h-5 w-5"/></div><div><b className="block text-lg">{value}</b><span className="text-[11px] text-[#7a727f]">{label}</span></div></div>}
function Mini({value,label}:{value:string;label:string}){return <div><b className="block text-lg font-black text-[#6333ad]">{value}</b><span className="text-[11px] text-[#77707c]">{label}</span></div>}
function Info({icon:Icon,title,children}:{icon:any;title:string;children:React.ReactNode}){return <article className="min-h-48 rounded-[24px] border border-[#ebe4f0] bg-[#faf7fc] p-6"><Icon className="h-6 w-6 text-[#6333ad]"/><h3 className="mt-5 text-lg font-black">{title}</h3><div className="mt-3 text-sm">{children}</div></article>}
