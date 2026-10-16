import Link from "next/link";
import { getCurrentUser } from "../../lib/auth";
import { getDashboardBusinessForUser } from "../../lib/active-business";
import StaffPage from "../../dashboard/staff/page";
import "../laundry.css";
export const dynamic="force-dynamic";
export const metadata={title:"INFRO · موظفو المغسلة",robots:{index:false,follow:false}};
export default async function LaundryStaffPage(){
 const user=await getCurrentUser();const b=user?await getDashboardBusinessForUser(user.id):null;
 if(!b||b.ownerId!==user?.id)return <main className="laundry-gate" dir="rtl"><h1>إدارة الموظفين متاحة لمالك المنشأة فقط</h1><Link href="/Laundromat">الكاشير</Link></main>;
 return <main dir="rtl" className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8"><Link href="/Laundromat" className="inline-flex min-h-11 items-center underline">العودة إلى المغسلة</Link><p className="rounded-2xl bg-teal-50 p-4 leading-8">حدد مهام كل موظف: الكاشير للطلبات والتحصيل، والمحاسبة للقيود والموردين والاشتراكات، والإشراف للعملاء والمخزون، والتوصيل للمهام المسندة فقط. يمكن جمع أكثر من صلاحية. إضافة الموظفين وتغيير صلاحياتهم للمالك فقط.</p><StaffPage/></main>;
}
