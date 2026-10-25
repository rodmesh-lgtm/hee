import Link from "next/link";
import {getCurrentUser} from "../../lib/auth";
import {getDashboardBusinessForUser} from "../../lib/active-business";
import {db} from "../../lib/db";
import {hasActiveBusinessSubscription} from "../../lib/subscription-entitlement";
import {LAUNDRY_READY_TEMPLATE_NAME,LAUNDRY_READY_TEMPLATE_EXAMPLE,laundryReadyTemplateSupported} from "../../lib/whatsapp/laundry-ready-domain";
import NotificationForm from "./form";
export const dynamic="force-dynamic";
export const metadata={title:"INFRO · إشعارات جاهزية الطلب",robots:{index:false,follow:false}};
const states:Record<string,string>={pending:"بانتظار المعالجة",processing:"قيد المعالجة",queued:"بانتظار الإرسال",retry_scheduled:"بانتظار إعادة المحاولة",sent:"أُرسلت",delivered:"تم التسليم",read:"تمت القراءة",completed:"عولج الحدث",processed:"عولج الحدث",skipped:"لم تتحقق شروط الإرسال",cancelled:"أُلغي الإرسال",failed:"تعذر الإرسال",delivery_unknown:"تعذر تأكيد الإرسال — لن يُكرر تلقائيًا"};
export default async function NotificationsPage(){
 const user=await getCurrentUser();const business=user?await getDashboardBusinessForUser(user.id):null;
 if(!business||business.ownerId!==user?.id)return <main dir="rtl" className="p-8"><h1>إعدادات الإشعارات متاحة لمالك المنشأة فقط</h1><Link href="/Laundromat">العودة للمغسلة</Link></main>;
 const [automation,templates,events,entitled]=await Promise.all([
 db.whatsAppAutomation.findFirst({where:{businessId:business.id,triggerType:"laundry_ready"}}),
 db.whatsAppTemplate.findMany({where:{businessId:business.id,provider:"meta",name:LAUNDRY_READY_TEMPLATE_NAME,status:"approved",category:"utility",connection:{businessId:business.id,provider:"meta",status:"connected",disabledAt:null,OR:[{marketingEnabled:true},{bookingEnabled:true}]}},select:{id:true,name:true,language:true,components:true,parameterFormat:true,connection:{select:{displayPhoneNumber:true}}}}),
 db.whatsAppAutomationEvent.findMany({where:{businessId:business.id,triggerType:"laundry_ready"},orderBy:{createdAt:"desc"},take:30,select:{id:true,status:true,createdAt:true,runs:{select:{status:true,job:{select:{status:true}}}}}}),
 hasActiveBusinessSubscription({businessId:business.id})]);
 const eligible=templates.filter(t=>laundryReadyTemplateSupported(t.components,t.parameterFormat));
 const action=automation?.actionConfig as {templateId?:string}|undefined;
 return <main dir="rtl" className="mx-auto max-w-3xl space-y-5 p-4 text-slate-900 sm:p-8"><Link href="/Laundromat" className="inline-flex min-h-11 items-center underline">العودة إلى المغسلة</Link><header><p className="text-sm text-teal-700">INFRO · {business.name}</p><h1 className="mt-2 text-2xl font-bold">إشعارات جاهزية الطلب</h1><p className="mt-3 leading-7">أبلغ العميل عبر واتساب حين يصبح طلبه جاهزًا للاستلام.</p></header><section className="space-y-3 rounded-2xl bg-slate-50 p-5"><h2 className="font-bold">تجهيز الإرسال</h2><p>{entitled?"✓ الاشتراك يتيح خدمة واتساب":"يلزم اشتراك يتيح خدمة واتساب"}</p><p>{eligible.length?"✓ يتوفر رقم متصل وقالب جاهزية معتمد":"اربط رقم المنشأة ثم أضف قالب «جاهزية طلب المغسلة» واعتمده لدى Meta."}</p><div className="flex flex-wrap gap-4"><Link className="min-h-11 underline" href="/dashboard/whatsapp/setup">ربط واتساب</Link><Link className="min-h-11 underline" href="/dashboard/whatsapp/templates">إدارة القوالب</Link></div><p className="rounded-xl bg-white p-3 leading-7">{LAUNDRY_READY_TEMPLATE_EXAMPLE}</p><p className="text-sm leading-7">المتغيرات: ١ اسم العميل، ٢ اسم المنشأة، ٣ رقم الطلب. يتم الإرسال عبر طابور المعالجة، وتظهر نتيجته أدناه. إيقاف الإشعار لا يسترجع رسالة سبق إرسالها.</p></section><NotificationForm businessId={business.id} enabled={automation?.status==="active"} templateId={action?.templateId??""} templates={eligible.map(t=>({id:t.id,label:`${t.name} · ${t.language} · ${t.connection.displayPhoneNumber??"رقم المنشأة"}`}))}/><section className="space-y-3"><h2 className="text-lg font-bold">آخر إشعارات الجاهزية</h2>{events.length?events.map(e=><article key={e.id} className="flex flex-wrap justify-between gap-3 rounded-xl border p-4"><time>{e.createdAt.toLocaleString("ar-SA",{timeZone:"Asia/Riyadh"})}</time><span>{states[e.runs[0]?.job?.status??e.runs[0]?.status??e.status]??"قيد المعالجة"}</span></article>):<p className="rounded-xl border border-dashed p-5 text-slate-600">لا توجد إشعارات جاهزية بعد.</p>}</section></main>;
}
