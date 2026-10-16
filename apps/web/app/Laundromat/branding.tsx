"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { saveLaundryLogo } from "./branding-actions";
export function LaundryBranding({business}:{business:{id:string;name:string;logoUrl:string|null}}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [failed,setFailed]=useState(false);
 return <section className="ld-panel ld-branding"><div className="ld-panel-title"><h2>شعار المنشأة</h2><ImagePlus size={24}/></div><div className="ld-logo-preview">{business.logoUrl?<Image unoptimized src={business.logoUrl} alt={`شعار ${business.name}`} width={120} height={120}/>:<span>لم يُرفع شعار بعد</span>}</div><p>يظهر شعارك في أعلى الكاشير وفي فواتير A4 والحراري. الشعار مشترك مع صفحة منشأتك في INFRO.</p><form onSubmit={async e=>{e.preventDefault();if(busy)return;const form=e.currentTarget;setBusy(true);setMessage("");try{const data=new FormData(form);data.set("businessId",business.id);const result=await saveLaundryLogo(data);setFailed(!result.ok);setMessage(result.ok?"تم حفظ شعار المنشأة":result.error??"تعذر الحفظ");if(result.ok){form.reset();router.refresh();}}catch{setFailed(true);setMessage("تعذر الاتصال. أعد المحاولة.");}finally{setBusy(false);}}}><label>رفع شعار المنشأة<input type="file" name="logoFile" accept="image/png,image/jpeg,image/webp,image/gif" required disabled={busy}/></label><p className="ld-fine">JPG أو PNG أو WebP أو GIF، بحد أقصى 2 ميجابايت. يفضّل شعارًا مربعًا بخلفية واضحة للطباعة.</p><button className="ld-primary" disabled={busy}>{busy?"جارٍ حفظ الشعار…":"حفظ الشعار"}</button></form>{message?<p role={failed?"alert":"status"} className={failed?"ld-alert":"ld-success"}>{message}</p>:null}</section>;
}
