"use client";
import { LaundryNavigation, laundryTitles } from "./navigation";
import Link from "next/link";
import { useState } from "react";
import { IrLogo } from "../../components/brand/ir-logo";
import { LaundryReconciliation } from "./reconciliation";
import { LaundryContracts } from "./contracts";
import { LaundryLedger } from "./ledger";
import { LaundryPrepaid } from "./prepaid";
import { LaundryPurchases } from "./purchases";
import { LaundryReports } from "./reports";
import { LaundryCustomers } from "./customers";
import { LaundryInventory } from "./inventory";
export function LaundryProfessionalWorkspace({business,mode,owner=false,program=false}:{program?:boolean;owner?:boolean;business:{id:string;name:string;logoUrl:string|null};mode:"accounting"|"operations"}){
 const [tab,setTab]=useState(mode==="accounting"?"ledger":"customers");const allowed=mode==="accounting"?["ledger","inventory","contracts","bank","prepaid","purchases","finance"]:["customers","inventory"];
 return <main className="laundry" dir="rtl"><header className="ld-top"><Link className="ld-brand" href="/dashboard"><IrLogo className="ld-platform-logo"/></Link><strong>{business.name}</strong>{owner?<Link href="/Laundromat/Staff">الموظفون والصلاحيات</Link>:null}<Link href="/dashboard">لوحة التحكم</Link></header><div className="ld-shell"><LaundryNavigation tab={tab} onChange={setTab} owner={owner} allowed={allowed} program={program}/><section className="ld-main"><div className="ld-heading"><div><p className="ld-eyebrow">INFRO · {mode==="accounting"?"الإدارة المالية":program?"التشغيل":"إشراف المغسلة"}</p><h1>{program?(mode==="accounting"?"الإدارة المالية":"العملاء والمخزون"):(mode==="accounting"?"محاسبة المغسلة":"إشراف المغسلة")}</h1><p>{laundryTitles[tab]}</p></div></div>{tab==="contracts"?<LaundryContracts businessId={business.id} business={business}/>:tab==="bank"?<LaundryReconciliation businessId={business.id}/>:tab==="ledger"?<LaundryLedger businessId={business.id}/>:tab==="prepaid"?<LaundryPrepaid businessId={business.id} business={business}/>:tab==="purchases"?<LaundryPurchases businessId={business.id} business={business}/>:tab==="finance"?<LaundryReports businessId={business.id}/>:tab==="customers"?<LaundryCustomers businessId={business.id}/>:<LaundryInventory businessId={business.id}/>}</section></div></main>;
}
