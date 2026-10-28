import { redirect } from "next/navigation";
import { accountingActivity } from "../../lib/accounting-program";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { LaundryDeliveryWorkspace } from "./workspace";
import "../laundry.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"INFRO · توصيل المنشأة",robots:{index:false,follow:false,noarchive:true}};
export default async function DeliveryPage(){
 const user=await getCurrentUser();if(!user)return <main className="laundry-gate" dir="rtl"><h1>توصيل المنشأة</h1><Link href="/login">تسجيل الدخول</Link></main>;
 const business=await getActiveBusinessForUser(user.id,"laundryDelivery");if(!business)return <main className="laundry-gate" dir="rtl"><h1>تحتاج صلاحية توصيل المنشأة</h1><p>يمنح المالك صلاحية التوصيل من إدارة فريق العمل. لا تحتاج صلاحية الكاشير.</p><Link href="/dashboard">لوحة التحكم</Link></main>;
 if(accountingActivity(business)!=="laundry")redirect("/Accounting?view=delivery");
 return <LaundryDeliveryWorkspace key={business.id} business={{id:business.id,name:business.name}} owner={business.ownerId===user.id}/>;
}
