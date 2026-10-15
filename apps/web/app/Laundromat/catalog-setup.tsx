"use client";
import { LAUNDRY_CATALOG, LAUNDRY_OPERATIONS } from "../lib/laundry-catalog";

export function LaundryCatalogSetup({busy,onSave}:{busy:boolean;onSave:(data:Record<string,unknown>)=>Promise<boolean>}) {
  return <section className="ld-panel ld-catalog-setup">
    <div className="ld-panel-title"><h2>دليل أصناف المغسلة الجاهز</h2><span>{LAUNDRY_CATALOG.length} صنفًا</span></div>
    <p className="ld-fine">اختر الخدمة وأدخل أسعار الأصناف التي تقدمها فقط. الحقول الفارغة لا تُضاف، والخدمات الموجودة لا تتغير أسعارها. تأكد من تعليمات العناية بالقماش قبل اعتماد نوع المعالجة.</p>
    <form onSubmit={async event=>{
      event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
      const items=LAUNDRY_CATALOG.map(item=>({presetId:item.id,price:String(data.get(item.id)??"").trim()})).filter(item=>item.price!=="");
      if(await onSave({operation:data.get("operation"),items}))form.reset();
    }}>
      <label>الخدمة المراد تسعيرها<select name="operation" defaultValue="wash_iron">{Object.entries(LAUNDRY_OPERATIONS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      {[...new Set(LAUNDRY_CATALOG.map(item=>item.category))].map((category,index)=><details key={category} open={index===0}>
        <summary>{category}<span>{LAUNDRY_CATALOG.filter(item=>item.category===category).length} أصناف</span></summary>
        <div className="ld-catalog-grid">{LAUNDRY_CATALOG.filter(item=>item.category===category).map(item=><label key={item.id}>{item.name}<input aria-label={`سعر ${item.name}`} name={item.id} inputMode="decimal" type="number" min="0.01" max="100000" step="0.01" placeholder="السعر بالريال"/></label>)}</div>
      </details>)}
      <button className="ld-primary" disabled={busy}>إضافة الأصناف المسعّرة إلى الكاشير</button>
    </form>
  </section>;
}
