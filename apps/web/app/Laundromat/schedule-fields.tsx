"use client";
import { useI18n } from "../../components/i18n/locale-provider";
import { useState } from "react";
import { cashierWorkflow } from "../lib/cashier-workflow";
import type { CashierActivityId } from "../lib/cashier-activity";
import type { LaundryServiceSpeed } from "../lib/laundry-domain";
import { calendarSubscriptionPeriod,deliveryShortcut,monthLabel,riyadhDate,subscriptionMonths } from "../lib/accounting-dates";
import { packagePeriod } from "../lib/accounting-packages";
const display=(value:Date,locale="ar-SA")=>new Intl.DateTimeFormat(`${locale}-u-ca-gregory`,{timeZone:"Asia/Riyadh",dateStyle:"full",timeStyle:"short"}).format(value);
export function DeliverySchedule({activityId="general",speed="normal"}:{activityId?:CashierActivityId;speed?:LaundryServiceSpeed}) {
 const { t: tr, intlLocale } = useI18n();

 const workflow=cashierWorkflow(activityId,speed);
 const [value,setValue]=useState("");
 const day=value.slice(0,10),time=value.slice(11)||"18:00",hour=Number(time.slice(0,2)),minute=time.slice(3)||"00";
 function updateTime(h:number,m:string) { setValue(`${day||riyadhDate()}T${String(h).padStart(2,"0")}:${m}`); }
 return <fieldset className="ld-schedule"><legend>{tr(workflow.scheduleTitle)}</legend><p className="ld-fine">{tr("اختر موعدًا سريعًا أو حدد اليوم والوقت. جميع المواعيد بتوقيت الرياض.")}</p><div className="ld-schedule-shortcuts">{workflow.shortcuts.map(p=><button key={p.hours} type="button" className="ld-outline" onClick={()=>setValue(deliveryShortcut(p.hours))}>{tr(p.label)}</button>)}</div><div className="ld-form-row"><label>{tr(workflow.dateLabel)}<input aria-label={tr(workflow.dateLabel)} type="date" required min={riyadhDate()} value={day} onChange={e=>setValue(e.target.value?`${e.target.value}T${time}`:"")}/></label><label>{tr(workflow.timeLabel)}<select aria-label={tr(workflow.timeLabel)} value={hour%12||12} onChange={e=>updateTime(Number(e.target.value)%12+(hour>=12?12:0),minute)}>{Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>{tr("الدقيقة")}<select aria-label={tr("دقيقة التسليم")} value={minute} onChange={e=>updateTime(hour,e.target.value)}>{["00","15","30","45"].map(n=><option key={n}>{n}</option>)}</select></label><label>{tr("الفترة")}<select aria-label={tr("فترة التسليم")} value={hour>=12?"pm":"am"} onChange={e=>updateTime(hour%12+(e.target.value==="pm"?12:0),minute)}><option value="am">{tr("صباحًا")}</option><option value="pm">{tr("مساءً")}</option></select></label></div><input type="hidden" name="dueAt" value={value}/>{value?<p role="status" className="ld-schedule-summary">{tr(workflow.summaryLabel)}{" "}<strong>{display(new Date(`${value}+03:00`),intlLocale)}</strong></p>:<p className="ld-fine">{tr("لم يُحدد موعد بعد. اضغط أحد الخيارات أو اختر يوم التسليم.")}</p>}</fieldset>;
}
export function SubscriptionSchedule({durationDays}:{durationDays?:number}) {
 const { t: tr, intlLocale } = useI18n();

 const [start,setStart]=useState(()=>riyadhDate()),[duration,setDuration]=useState(durationDays?"plan":"1"),[customEnd,setCustomEnd]=useState("");
 let period:ReturnType<typeof calendarSubscriptionPeriod>|null=null,error="";
 try { if(duration==="plan")period=packagePeriod(start,durationDays!);else if(duration!=="custom")period=calendarSubscriptionPeriod(start,Number(duration)); } catch(e) { error=e instanceof Error?e.message:"راجع التاريخ"; }
 return <fieldset className="ld-schedule"><legend>{tr("بداية الاشتراك ومدته")}</legend><div className="ld-form-row"><label>{tr("تاريخ البداية")}<input aria-label={tr("تاريخ بداية الاشتراك")} name="starts" type="date" required min={riyadhDate()} value={start} onChange={e=>setStart(e.target.value)}/></label><label>{tr("مدة الاشتراك")}<select aria-label={tr("مدة الاشتراك")} name="durationMonths" value={duration} onChange={e=>setDuration(e.target.value)}>{durationDays?<option value="plan">{tr("مدة الباقة الأصلية ·")}{" "}{durationDays}{" "}{tr("يوم")}</option>:null}{subscriptionMonths.map(n=><option key={n} value={n}>{tr(n===1?"شهر واحد":monthLabel(n))}</option>)}{!durationDays?<option value="custom">{tr("تاريخ نهاية مخصص")}</option>:null}</select></label></div>{duration==="custom"?<label>{tr("آخر يوم للاستخدام")}<input aria-label={tr("آخر يوم للاستخدام")} type="date" name="expires" required min={start} value={customEnd} onChange={e=>setCustomEnd(e.target.value)}/></label>:<><input type="hidden" name="expires" value=""/>{period?<p role="status" className="ld-schedule-summary">{tr("يبدأ:")}{" "}<strong>{display(period.startsAt,intlLocale)}</strong><br/>{tr("ينتهي:")}{" "}<strong>{display(period.expiresAt,intlLocale)}</strong></p>:null}</>}{error?<p role="alert" className="ld-alert">{tr(error)}</p>:null}<p className="ld-fine">{tr("تُحسب الأشهر تقويميًا تلقائيًا، مع مراعاة فبراير ونهاية الشهر. ينتهي الاستخدام عند الموعد الموضح أعلاه.")}</p></fieldset>;
}
