"use client";

import { useState } from "react";
import { Camera, Copy, CheckCircle2 } from "lucide-react";
import { CAMERA_BRANDS, LIVE_ACTIVITIES, cameraPath, isPrivateCameraHost } from "../../lib/live-view/camera-profiles";

const field = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900";

export function CameraPreparationGuide({ activated = false }: { activated?: boolean }) {
  const [activity, setActivity] = useState<keyof typeof LIVE_ACTIVITIES>("workshop");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [device, setDevice] = useState("camera");
  const [host, setHost] = useState("");
  const [channel, setChannel] = useState("1");
  const [customPath, setCustomPath] = useState("");
  const [rtsp, setRtsp] = useState("unknown");
  const [copied, setCopied] = useState("");
  const [checks, setChecks] = useState<string[]>([]);
  let path = "", pathError = "";
  if (brand) {
    try { path = cameraPath(brand, Number(channel), "sub", customPath); }
    catch { pathError = brand === "custom" ? "أدخل مسار RTSP يبدأ بـ / دون عنوان كامل أو بيانات دخول، وقناة بين 1 و256." : "أدخل رقم قناة صحيحًا بين 1 و256."; }
  }
  const validHost = !host || isPrivateCameraHost(host.trim());
  const tasks = [
    { id: "network", text: "جهاز Windows والكاميرات على الشبكة المحلية نفسها." },
    { id: "codec", text: "البث الفرعي مضبوط على H.264؛ ابدأ بدقة 720p ومعدل 10–15 إطارًا/ثانية إذا أتاح الجهاز ذلك." },
    { id: "reader", text: "يوجد حساب مخصص للمشاهدة على الكاميرا أو جهاز التسجيل." },
    { id: "view", text: `زاوية الكاميرا مخصصة لـ${LIVE_ACTIVITIES[activity].station} العميل، وتستبعد مناطق العملاء الآخرين.` },
  ];
  const summary = [
    "INFRO Live — تجهيز كاميرا",
    `النشاط: ${LIVE_ACTIVITIES[activity].label}`,
    `الجهاز: ${device === "camera" ? "كاميرا مباشرة" : "جهاز تسجيل NVR / DVR"}`,
    `الماركة: ${CAMERA_BRANDS[brand as keyof typeof CAMERA_BRANDS] || "غير محددة"}`,
    `الموديل: ${model.trim() || "غير محدد"}`,
    `عنوان الشبكة: ${host.trim() || "يُحدد من إعدادات الجهاز"}`,
    `القناة: ${channel}`,
    `مسار البث المقترح: ${path}`,
    "الترميز المطلوب: H.264. المنفذ المعتاد: 554؛ يُراجع في إعدادات الجهاز.",
    "هذا ملخص تجهيز؛ اعتماد التوافق يتطلب فحص بث فعلي داخل INFRO.",
  ].join("\n");

  return <section aria-labelledby="camera-guide-title" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-start gap-3"><Camera className="mt-1 shrink-0 text-teal-700" size={23}/><div><h2 id="camera-guide-title" className="text-lg font-black">جهّز كاميرتك للربط</h2><p className="mt-2 text-sm leading-7 text-slate-600">اختر جهازك للحصول على خطوات التجهيز ومسار بث مقترح. {activated ? "بعد التجهيز، أضف الموقع واقرن جهازه ثم افحص الصورة من حسابك." : "يمكنك استخدام الدليل الآن؛ الاقتران وفحص الصورة يتاحان بعد تفعيل الخدمة."}</p></div></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">نوع النشاط<select className={field} value={activity} onChange={e => setActivity(e.target.value as keyof typeof LIVE_ACTIVITIES)}>{Object.entries(LIVE_ACTIVITIES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      <label className="text-sm font-bold">نوع الجهاز<select className={field} value={device} onChange={e => setDevice(e.target.value)}><option value="camera">كاميرا مباشرة</option><option value="recorder">جهاز تسجيل NVR / DVR</option></select></label>
      <label className="text-sm font-bold">الماركة<select className={field} value={brand} onChange={e => { setBrand(e.target.value); setCopied(""); }}><option value="">اختر الماركة</option>{Object.entries(CAMERA_BRANDS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="text-sm font-bold">الموديل <span className="font-normal text-slate-500">(اختياري)</span><input className={field} dir="ltr" value={model} maxLength={100} onChange={e => setModel(e.target.value)} placeholder="الموديل المدون على الجهاز" autoComplete="off"/></label>
      <label className="text-sm font-bold">عنوان الجهاز المحلي <span className="font-normal text-slate-500">(اختياري)</span><input className={field} dir="ltr" value={host} maxLength={15} onChange={e => setHost(e.target.value)} placeholder="192.168.1.100" aria-invalid={!validHost} aria-describedby={!validHost ? "camera-host-error" : undefined} autoComplete="off"/>{!validHost && <span id="camera-host-error" className="mt-2 block text-xs text-red-700">استخدم عنوان IPv4 محليًا من إعدادات الجهاز، مثل 192.168.1.100.</span>}</label>
      <label className="text-sm font-bold">{device === "camera" ? "رقم قناة الكاميرا" : "قناة الكاميرا في جهاز التسجيل"}<input className={field} dir="ltr" type="number" min={1} max={256} step={1} value={channel} onChange={e => setChannel(e.target.value)} aria-invalid={Boolean(pathError)}/><span className="mt-2 block text-xs font-normal leading-6 text-slate-500">الكاميرا المباشرة غالبًا قناة 1. في جهاز التسجيل اختر قناة مساحة العميل.</span></label>
      {brand === "custom" && <label className="text-sm font-bold sm:col-span-2">مسار RTSP من دليل المصنع<input className={field} dir="ltr" value={customPath} maxLength={300} onChange={e => setCustomPath(e.target.value)} placeholder="/live/substream" autoComplete="off"/><span className="mt-2 block text-xs font-normal text-slate-500">أدخل المسار فقط. تُضاف بيانات الدخول لاحقًا في نموذج ربط الكاميرا.</span></label>}
      <label className="text-sm font-bold sm:col-span-2">هل يدعم الجهاز RTSP؟<select className={field} value={rtsp} onChange={e => setRtsp(e.target.value)}><option value="unknown">لم أتحقق بعد</option><option value="yes">نعم، متاح في إعدادات الجهاز</option><option value="no">لا، يعمل بتطبيق مغلق فقط</option></select></label>
    </div>
    {rtsp === "no" ? <div role="status" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-8 text-amber-950">يلزم التأكد من المصنع من وجود RTSP أو طريقة ربط معتمدة. إدخال الموديل وحده لا يتيح الربط بأجهزة التطبيقات المغلقة.</div> : <div className="mt-5 rounded-2xl bg-slate-50 p-4">
      <h3 className="text-sm font-black">إعداد البث المقترح</h3>
      {rtsp === "unknown" && <p className="mt-2 text-sm leading-7 text-slate-600">راجع إعدادات الشبكة أو دليل الجهاز لتفعيل RTSP قبل محاولة الاقتران.</p>}
      {pathError ? <p role="alert" className="mt-3 text-sm text-red-700">{pathError}</p> : path ? <><code dir="ltr" className="mt-3 block select-all break-all rounded-xl bg-slate-950 p-4 text-xs leading-7 text-teal-200">{path}</code><p className="mt-3 text-xs leading-7 text-slate-600">قالب حسب الماركة؛ قد يختلف باختلاف الموديل وإصدار الجهاز. كتابة الموديل لا تعني اعتماد توافقه. يُحسم التوافق بفحص المصدر والصورة الفعليين.</p></> : <p className="mt-3 text-sm text-slate-600">اختر الماركة لعرض المسار المقترح.</p>}
    </div>}
    <fieldset className="mt-5 space-y-3"><legend className="mb-3 text-sm font-black">قائمة التجهيز · {checks.length} من {tasks.length}</legend>{tasks.map(task => <label key={task.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-7"><input type="checkbox" checked={checks.includes(task.id)} onChange={e => { const checked = e.target.checked; setChecks(previous => checked ? [...previous, task.id] : previous.filter(id => id !== task.id)); }} className="mt-2 size-4 shrink-0 accent-teal-700"/>{task.text}</label>)}</fieldset>
    <p className="mt-4 text-xs leading-7 text-slate-500">هذه اختيارات تجهيز على هذه الصفحة، وتُمسح عند مغادرتها. لا تُدخل كلمات المرور هنا؛ {activated ? "مكانها نموذج إضافة الكاميرا في هذه الصفحة." : "مكانها نموذج ربط الكاميرا بعد تفعيل الخدمة."}</p>
    <button type="button" disabled={!path || !validHost || rtsp === "no"} onClick={async () => { try { await navigator.clipboard.writeText(summary); setCopied("تم نسخ ملخص التجهيز."); } catch { setCopied("تعذر النسخ. يمكنك تحديد المسار ونسخه يدويًا."); } }} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Copy size={16}/> نسخ ملخص التجهيز للفني</button>
    <p aria-live="polite" className="mt-3 text-sm text-teal-800">{copied && <span className="inline-flex items-center gap-2"><CheckCircle2 size={16}/>{copied}</span>}</p>
  </section>;
}
