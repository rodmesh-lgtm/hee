import Link from "next/link";
import { getCurrentUser } from "../../lib/auth";
import { getDashboardBusinessForUser } from "../../lib/active-business";
import StaffPage from "../../dashboard/staff/page";
import "../laundry.css";
export const dynamic="force-dynamic";
export const metadata={title:"INFRO · موظفو المنشأة",robots:{index:false,follow:false}};
export default async function LaundryStaffPage(){
 const user=await getCurrentUser();const b=user?await getDashboardBusinessForUser(user.id):null;
 if(!b||b.ownerId!==user?.id)return <main className="laundry-gate" dir="rtl"><h1>إدارة الموظفين متاحة لمالك المنشأة فقط</h1><Link href="/Laundromat">الكاشير</Link></main>;
 return <main dir="rtl" className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-7"><nav aria-label="مسار صفحة الموظفين" className="text-sm"><Link href="/Laundromat" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">العودة إلى نقطة البيع</Link></nav><StaffPage/></main>;
}
