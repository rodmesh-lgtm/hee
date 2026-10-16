import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { LaundryProfessionalWorkspace } from "../professional-workspace";
import "../laundry.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"INFRO · إشراف المغسلة",robots:{index:false,follow:false,noarchive:true}};
export default async function OperationsPage(){const user=await getCurrentUser();const b=user?await getActiveBusinessForUser(user.id,"laundryOperations"):null;if(!b)return <main className="laundry-gate" dir="rtl"><h1>تحتاج صلاحية إشراف المغسلة</h1><Link href={user?"/dashboard":"/login"}>{user?"لوحة التحكم":"تسجيل الدخول"}</Link></main>;return <LaundryProfessionalWorkspace key={b.id} mode="operations" business={{id:b.id,name:b.name,logoUrl:b.logoUrl}}/>;}
