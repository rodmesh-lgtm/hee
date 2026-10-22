"use client";
import Link from "next/link";
import { useState } from "react";
import { Shirt, PackageCheck, Wallet, Users, ReceiptText, Warehouse, FileSignature, Landmark, BookOpen, Settings2, Image, UserRoundCog, MessageCircle, Truck, Search, Menu, X } from "lucide-react";
const groups=[
 {label:"التشغيل",items:[{id:"pos",label:"الكاشير",icon:Shirt},{id:"orders",label:"الطلبات والتسليم",icon:PackageCheck},{id:"customers",label:"العملاء",icon:Users},{id:"inventory",label:"المخزون والجرد",icon:Warehouse}]},
 {label:"الإدارة المالية",items:[{id:"ledger",label:"دفتر المحاسبة",icon:BookOpen},{id:"finance",label:"التحصيل والمصروفات",icon:Wallet},{id:"purchases",label:"الموردون والمشتريات",icon:ReceiptText},{id:"prepaid",label:"اشتراكات العملاء",icon:Wallet},{id:"contracts",label:"العقود والتوقيع",icon:FileSignature},{id:"bank",label:"التسوية البنكية",icon:Landmark}]},
 {label:"إعداد المغسلة",items:[{id:"services",label:"الخدمات والأسعار",icon:Settings2},{id:"branding",label:"شعار المنشأة",icon:Image}]}
];
export const laundryTitles=Object.fromEntries(groups.flatMap(g=>g.items.map(i=>[i.id,i.label])));
export function LaundryNavigation({tab,onChange,owner,allowed}:{allowed?:string[];tab:string;onChange:(tab:string)=>void;owner:boolean}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState("");
 function select(id:string){onChange(id);setOpen(false);setSearch("");}
 return <aside className={`ld-sidebar ld-navigation ${open?"is-open":""}`} aria-label="أقسام المغسلة">
  <div className="ld-mobile-nav"><button type="button" aria-expanded={open} aria-controls="laundry-navigation" onClick={()=>setOpen(!open)}>{open?<X size={20}/>:<Menu size={20}/>}<span>{laundryTitles[tab]}</span><small>الأقسام</small></button>{tab!=="pos"&&(!allowed||allowed.includes("pos"))?<button type="button" onClick={()=>select("pos")}><Shirt size={18}/>طلب جديد</button>:null}</div>
  <nav id="laundry-navigation" className="ld-nav-content" aria-label="التنقل بين أقسام المغسلة">
   <label className="ld-nav-search"><Search size={16}/><input aria-label="البحث عن قسم" placeholder="ابحث عن قسم…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   {groups.map(group=>{const items=group.items.filter(i=>(allowed?allowed.includes(i.id):owner||["pos","orders"].includes(i.id))&&i.label.includes(search));return items.length?<div className="ld-nav-group" key={group.label}><p>{group.label}</p>{items.map(item=><button key={item.id} aria-current={tab===item.id?"page":undefined} onClick={()=>select(item.id)} className={tab===item.id?"active":""}><item.icon size={18}/><span>{item.label}</span></button>)}</div>:null;})}
   {owner?<div className="ld-nav-group ld-nav-settings"><p>الفريق والتواصل</p>{[{href:"Staff",label:"الموظفون والصلاحيات",icon:UserRoundCog},{href:"Notifications",label:"إشعارات واتساب",icon:MessageCircle},{href:"Delivery",label:"إدارة التوصيل",icon:Truck}].filter(i=>i.label.includes(search)).map(i=><Link key={i.href} href={`/Laundromat/${i.href}`}><i.icon size={18}/><span>{i.label}</span></Link>)}</div>:null}
   {search&&!groups.some(g=>g.items.some(i=>(allowed?allowed.includes(i.id):owner||["pos","orders"].includes(i.id))&&i.label.includes(search)))?<p className="ld-fine">اختر من النتائج أو غيّر كلمة البحث.</p>:null}
  </nav>
 </aside>;
}
