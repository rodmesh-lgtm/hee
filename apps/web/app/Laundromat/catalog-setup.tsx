"use client";
import { useState } from "react";
import { LAUNDRY_CATALOG, LAUNDRY_PRIMARY_OPERATIONS, resolveLaundryPreset } from "../lib/laundry-catalog";
import type { LaundryService } from "../lib/laundry-domain";
import { laundryMoney } from "../lib/laundry-domain";

export function LaundryCatalogSetup({busy,services,onSave}:{busy:boolean;services:LaundryService[];onSave:(data:Record<string,unknown>)=>Promise<boolean>}) {
  const [error,setError]=useState("");
  return <section className="ld-panel ld-catalog-setup">
    <div className="ld-panel-title"><h2>دليل أصناف المغسلة الجاهز</h2><span>{LAUNDRY_CATALOG.length} صنفًا</span></div>
    <p className="ld-fine">سعّر الصنف مرة واحدة: غسيل وكوي، وكوي فقط. اترك السعر فارغًا للخدمة التي لا تقدمها. الأسعار المحفوظة ظاهرة ولا تتغير عند إضافة الخدمة الأخرى.</p>
    <form onSubmit={async event=>{
      event.preventDefault();setError("");const form=event.currentTarget;const data=new FormData(form);
      const items=LAUNDRY_CATALOG.flatMap(item=>Object.keys(LAUNDRY_PRIMARY_OPERATIONS).map(operation=>({presetId:item.id,operation,price:String(data.get(`${item.id}:${operation}`)??"").trim()}))).filter(item=>item.price!=="");
      if(!items.length){setError("أدخل سعر خدمة واحدة على الأقل لإضافتها.");return;}
      if(await onSave({items}))form.reset();
    }}>
      {[...new Set(LAUNDRY_CATALOG.map(item=>item.category))].map((category,index)=><details key={category} open={index===0}>
        <summary>{category}<span>{LAUNDRY_CATALOG.filter(item=>item.category===category).length} أصناف</span></summary>
        <div className="ld-catalog-grid ld-dual-catalog">{LAUNDRY_CATALOG.filter(item=>item.category===category).map(item=><fieldset key={item.id}><legend>{item.name}</legend><div className="ld-price-pair">{Object.entries(LAUNDRY_PRIMARY_OPERATIONS).map(([operation,label])=>{
          const existing=services.find(service=>service.name===resolveLaundryPreset(item.id,operation)?.name&&service.category===item.category);
          return <label key={operation}>{label}{existing?<span className="ld-existing-price">{laundryMoney(existing.price)} ر.س · مفعّلة</span>:<input aria-label={`سعر ${item.name} — ${label}`} name={`${item.id}:${operation}`} inputMode="decimal" type="number" min="0.01" max="100000" step="0.01" placeholder="السعر بالريال"/>}</label>;
        })}</div></fieldset>)}</div>
      </details>)}
      {error?<p role="alert" className="ld-alert">{error}</p>:null}
      <button className="ld-primary" disabled={busy}>إضافة الأصناف المسعّرة إلى الكاشير</button>
    </form>
  </section>;
}
