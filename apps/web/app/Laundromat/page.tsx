import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { cashierProfileForBusiness } from "../lib/cashier-profile-server";
import type { Metadata } from "next";
import { AccountingWorkspacePage } from "./server-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"INFRO انفرو · كاشير المنشأة",robots:{index:false,follow:false,noarchive:true}};
export default async function LaundryPage(props:{searchParams:Promise<{q?:string;filter?:string}>}){
 const user=await getCurrentUser();const business=user?await getActiveBusinessForUser(user.id,"laundry"):null;
 if(business&&(await cashierProfileForBusiness(business)).id!=="laundry"){
  const params=await props.searchParams;const query=new URLSearchParams();if(params.q)query.set("q",params.q);if(params.filter)query.set("filter",params.filter);
  redirect(`/Accounting${query.size?`?${query}`:""}`);
 }
 return AccountingWorkspacePage(props);
}
