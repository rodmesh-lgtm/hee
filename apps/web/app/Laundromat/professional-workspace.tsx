"use client";
import Link from "next/link";
import { useState } from "react";
import { IrLogo } from "../../components/brand/ir-logo";
import { LaundryReconciliation } from "./reconciliation";
import { LaundryLedger } from "./ledger";
import { LaundryPrepaid } from "./prepaid";
import { LaundryPurchases } from "./purchases";
import { LaundryReports } from "./reports";
import { LaundryCustomers } from "./customers";
import { LaundryInventory } from "./inventory";
export function LaundryProfessionalWorkspace({business,mode,owner=false}:{owner?:boolean;business:{id:string;name:string;logoUrl:string|null};mode:"accounting"|"operations"}){
 const [tab,setTab]=useState(mode==="accounting"?"ledger":"customers");const tabs=mode==="accounting"?[{id:"bank",label:"التسوية البنكية"},{id:"ledger",label:"دفتر المحاسبة"},{id:"prepaid",label:"اشتراكات العملاء"},{id:"purchases",label:"الموردون والمشتريات"},{id:"report",label:"تقارير التحصيل"}]:[{id:"customers",label:"العملاء"},{id:"inventory",label:"المخزون والجرد"}];
 return <main className="laundry" dir="rtl"><header className="ld-top"><Link className="ld-brand" href="/dashboard"><IrLogo className="ld-platform-logo"/></Link><strong>{business.name}</strong>{owner?<Link href="/Laundromat/Staff">الموظفون والصلاحيات</Link>:null}<Link href="/dashboard">لوحة التحكم</Link></header><div className="ld-shell"><nav className="ld-sidebar" aria-label="مساحة الموظف">{tabs.map(t=><button key={t.id} className={tab===t.id?"active":""} aria-current={tab===t.id?"page":undefined} onClick={()=>setTab(t.id)}>{t.label}</button>)}</nav><section className="ld-main"><h1>{mode==="accounting"?"محاسبة المغسلة":"إشراف المغسلة"}</h1>{tab==="bank"?<LaundryReconciliation businessId={business.id}/>:tab==="ledger"?<LaundryLedger businessId={business.id}/>:tab==="prepaid"?<LaundryPrepaid businessId={business.id} business={business}/>:tab==="purchases"?<LaundryPurchases businessId={business.id} business={business}/>:tab==="report"?<LaundryReports businessId={business.id}/>:tab==="customers"?<LaundryCustomers businessId={business.id}/>:<LaundryInventory businessId={business.id}/>}</section></div></main>;
}
