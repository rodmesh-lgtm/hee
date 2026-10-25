"use client";
import { useI18n } from "../../components/i18n/locale-provider";
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
export function LaundryProfessionalWorkspace({business,mode,owner=false,program=false}:{program?:boolean;owner?:boolean;business:{id:string;name:string;logoUrl:string|null;phone?:string;address?:string};mode:"accounting"|"operations"}){
 const { t: tr, dir } = useI18n();

 const [tab,setTab]=useState(mode==="accounting"?"ledger":"customers");const allowed=mode==="accounting"?["ledger","inventory","contracts","bank","prepaid","purchases","finance"]:["customers","inventory"];
 return <main className="laundry" dir={dir}><header className="ld-top"><Link className="ld-brand" href="/dashboard"><IrLogo className="ld-platform-logo"/></Link><strong>{business.name}</strong>{owner?<Link href="/Laundromat/Staff">{tr("الموظفون والصلاحيات")}</Link>:null}<Link href="/dashboard">{tr("لوحة التحكم")}</Link></header><div className="ld-shell"><LaundryNavigation tab={tab} onChange={setTab} owner={owner} allowed={allowed} program={program}/><section className="ld-main"><div className="ld-heading"><div><p className="ld-eyebrow">INFRO · {mode==="accounting"?tr("الإدارة المالية"):program?tr("التشغيل"):tr("إشراف المغسلة")}</p><h1>{program?(mode==="accounting"?tr("الإدارة المالية"):tr("العملاء والمخزون")):(mode==="accounting"?tr("محاسبة المغسلة"):tr("إشراف المغسلة"))}</h1><p>{tr(laundryTitles[tab])}</p></div></div>{tab==="contracts"?<LaundryContracts businessId={business.id} business={business}/>:tab==="bank"?<LaundryReconciliation businessId={business.id}/>:tab==="ledger"?<LaundryLedger businessId={business.id}/>:tab==="prepaid"?<LaundryPrepaid businessId={business.id} business={business}/>:tab==="purchases"?<LaundryPurchases businessId={business.id} business={business}/>:tab==="finance"?<LaundryReports businessId={business.id}/>:tab==="customers"?<LaundryCustomers businessId={business.id}/>:<LaundryInventory businessId={business.id}/>}</section></div></main>;
}
