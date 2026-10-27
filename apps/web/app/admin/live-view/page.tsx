import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";
import { commercialAccess } from "../../lib/commercial-access";
import { connectorPlatformConfig } from "../../lib/live-view/connector-server";
import { connectorOnline, INPUT_STATUS_LABELS } from "../../lib/live-view/camera-profiles";

export const dynamic="force-dynamic";
const time=(value:Date|null)=>value?.toLocaleString("ar-SA",{timeZone:"Asia/Riyadh"})||"لم يُسجل";
export default async function AdminLiveViewPage({searchParams}:{searchParams:Promise<{businessId?:string}>}) {
 await requireAdmin();
 const businessId=String((await searchParams).businessId||"");
 if(businessId&&!/^[0-9a-f-]{36}$/i.test(businessId))notFound();
 const businesses=await db.business.findMany({where:{deletedAt:null,...(businessId?{id:businessId}:{liveViewConnectors:{some:{}}})},select:{id:true,name:true},take:100,orderBy:{name:"asc"}});
 const selected=businesses.find(b=>b.id===businessId);
 if(businessId&&!selected)notFound();
 const [connectors,stations,configured,access]=selected?await Promise.all([
  db.liveViewConnector.findMany({where:{businessId:selected.id},select:{id:true,name:true,enrolledAt:true,lastSeenAt:true,revokedAt:true},orderBy:{createdAt:"asc"},take:100}),
  db.liveViewStation.findMany({where:{businessId:selected.id},select:{id:true,name:true,enabled:true,connectorId:true,cameraHost:true,cameraPort:true,cameraChannel:true,cameraProfile:true,cameraPath:true,inputStatus:true,inputCheckedAt:true,lastOnline:true,lastCheckedAt:true},take:100,orderBy:{createdAt:"asc"}}),
  // Query a boolean presence via IDs; never select credentials or their encrypted envelope.
  db.liveViewStation.findMany({where:{businessId:selected.id,credentialEnvelope:{not:null}},select:{id:true},take:100}),
  commercialAccess(selected.id)
 ]):[[],[],[],null];
 const hasCredentials=new Set(configured.map(s=>s.id));
 return <main dir="rtl" className="space-y-5 p-5"><h1 className="text-2xl font-black">تشخيص ربط الكاميرات</h1><p className="text-sm">قراءة إدارية لحالة الإعداد والاتصال. لا تُعرض كلمات المرور أو رموز الاقتران ولا يتم الدخول إلى جلسة العميل.</p><form method="get" className="flex gap-3"><label>المنشأة<select name="businessId" defaultValue={businessId} className="mr-2 min-h-11 rounded border px-3"><option value="">اختر منشأة</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><button className="min-h-11 rounded border px-4">عرض التشخيص</button></form>{selected&&<><h2 className="text-xl font-bold">{selected.name}</h2><p>إعداد خادم البث: {connectorPlatformConfig()?"موجود":"غير مكتمل"} · صلاحية البث: {access?.liveView?"متاحة":"غير متاحة"}</p><h2 className="font-bold">أجهزة الربط</h2>{connectors.map(c=><article className="rounded-xl border p-4" key={c.id}><b>{c.name} · {c.id.slice(-6)}</b><p>{c.revokedAt?"مفصول":connectorOnline(c)?"متصل":c.enrolledAt?"غير متصل":"بانتظار الاقتران"} · آخر اتصال: {time(c.lastSeenAt)}</p><p>القنوات المرتبطة: {stations.filter(s=>s.connectorId===c.id).length}</p></article>)}<h2 className="font-bold">مصادر الكاميرات والمحطات</h2>{!stations.length&&<p>لا توجد كاميرات أو محطات محفوظة لهذه المنشأة.</p>}{stations.map(s=><article className="space-y-2 rounded-xl border p-4" key={s.id}><b>{s.name} · {s.id.slice(-6)}</b><p>جهاز الربط: {s.connectorId?`${connectors.find(c=>c.id===s.connectorId)?.name||"موقع غير متاح"} · ${s.connectorId.slice(-6)}`:"غير مرتبط بموصل"} · {s.enabled?"مفعلة":"معطلة"}</p><p>مصدر الكاميرا: {s.cameraHost||"غير محفوظ"} · منفذ {s.cameraPort} · قناة {s.cameraChannel} · {s.cameraProfile} · بيانات الدخول: {hasCredentials.has(s.id)?"محفوظة":"غير محفوظة"}</p><p>حالة المصدر: {INPUT_STATUS_LABELS[s.inputStatus]||"غير معروفة"} · وقت التقرير: {time(s.inputCheckedAt)}</p><p>وصول البث للخادم: {s.lastOnline?"تم التحقق سابقًا":"لم يُتحقق"} · آخر فحص: {time(s.lastCheckedAt)}</p></article>)}<Link href={`/admin/businesses/${selected.id}`} className="inline-block min-h-11 underline">تفاصيل المنشأة</Link></>}</main>;
}
