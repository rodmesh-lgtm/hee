'use client';
import { useRef, useState } from 'react';
import { useAutoRefresh, RefreshStatus } from './auto-refresh';
import { downloadReport, printReport } from '../../lib/retail-analytics/report-export';
type Report = {businessId:string;from:string;until:string;fetchedAt:string;unassigned:number;rows:{id:string;name:string;active:boolean;counts:Record<string,number>}[]};
export default function BranchWorkspace({businessId,today,english}:{businessId:string;today:string;english:boolean}) {
  const t=(ar:string,en:string)=>english?en:ar;
  const [from,setFrom]=useState(today),[until,setUntil]=useState(today);
  const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [hidden,setHidden]=useState<string[]>([]);
  const generation=useRef(0);
  async function refresh(signal?:AbortSignal) {
    const run=++generation.current;setBusy(true);
    try {
      const response=await fetch(`/api/retail-analytics/branches?${new URLSearchParams({businessId,from,until})}`,{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
      const payload=await response.json();
      if(signal?.aborted||run!==generation.current)return false;
      if(!response.ok||payload.businessId!==businessId||payload.from!==from||payload.until!==until)throw new Error('UNAVAILABLE');
      setReport(payload);setError('');return true;
    } catch {if(!signal?.aborted&&run===generation.current){setReport(null);setError(t('تعذرت قراءة مقارنة الفروع. تحقق من الفترة وصلاحيات الحساب ثم أعد المحاولة.','Branch comparison unavailable. Check period and permissions, then retry.'));}return false;}
    finally {if(run===generation.current)setBusy(false);}
  }
  const automatic=useAutoRefresh(`${businessId}:${from}:${until}`,true,refresh,60000);
  function change(field:'from'|'until',value:string){generation.current++;setReport(null);setError('');setBusy(false);if(field==='from')setFrom(value);else setUntil(value);}
  const rows=(report?.rows??[]).filter(r=>!hidden.includes(r.id)).map(r=>({...r,total:Object.values(r.counts).reduce((sum,n)=>sum+n,0)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
  const headers=[t('الفرع','Branch'),t('المواعيد','Appointments'),t('بانتظار التأكيد','Pending'),t('مؤكد','Confirmed'),t('مكتمل','Completed'),t('ملغى','Cancelled'),t('لم يحضر','No show'),t('نسبة الإكمال','Completion rate')];
  const doc={title:t('INFRO 360 · مقارنة فروع المنشأة','INFRO 360 · Business branch comparison'),metadata:[`${from} → ${until}`,t('المصدر: حجوزات INFRO حسب تاريخ الموعد. هذه مؤشرات حجوزات وليست مبيعات أو أرباحًا.','Source: INFRO bookings by appointment date. These are booking metrics, not revenue or profit.'),`${t('آخر قراءة','Last read')}: ${report?.fetchedAt??'—'}`],headers,rows:rows.map(r=>[r.name,r.total,r.counts.pending??0,r.counts.confirmed??0,r.counts.completed??0,r.counts.cancelled??0,r.counts.no_show??0,r.total?`${((r.counts.completed??0)/r.total*100).toFixed(1)}%`:'—'])};
  return <section className="space-y-5 rounded-3xl border border-teal-500/30 p-5 md:p-7" aria-label={t('مقارنة فروع INFRO','INFRO branch comparison')}><header><h2 className="text-2xl font-bold">{t('فروع منشأتك في INFRO','Your INFRO branches')}</h2><p className="mt-3 leading-7">{t('راقب توزيع المواعيد والإكمال والإلغاء وعدم الحضور بين الفروع. تُحسب المؤشرات حسب تاريخ الموعد، ولا تمثل إيرادات الفروع.','Monitor appointments, completion, cancellation and no-shows across branches. Metrics use appointment dates and do not represent branch revenue.')}</p></header>
  <div className="grid gap-4 sm:grid-cols-3"><label>{t('من','From')}<input className="mt-2 min-h-11 w-full rounded-xl border bg-transparent px-3" type="date" value={from} onChange={e=>change('from',e.target.value)}/></label><label>{t('إلى','Through')}<input className="mt-2 min-h-11 w-full rounded-xl border bg-transparent px-3" type="date" value={until} onChange={e=>change('until',e.target.value)}/></label><button className="min-h-11 self-end rounded-xl bg-teal-600 px-4 py-3 font-bold text-white" disabled={busy} onClick={()=>void refresh()}>{busy?t('جارٍ التحديث…','Refreshing…'):t('تحديث مقارنة الفروع','Refresh branch comparison')}</button></div><p className="text-sm">{t('اختر حتى 31 يومًا ضمن آخر 59 يومًا. الفترة ثابتة حتى تغيّرها.','Choose up to 31 days within the last 59 days. The period stays fixed until changed.')}</p>
  <RefreshStatus state={automatic} busy={busy} english={english}/>{error?<p role="alert">{error}</p>:null}
  {report?<><p className="text-sm">{t('آخر قراءة','Last read')}: {new Date(report.fetchedAt).toLocaleString(english?'en':'ar-SA')} · {t('مواعيد دون فرع معروف','Appointments without a known branch')}: {report.unassigned}</p><details><summary className="cursor-pointer font-bold">{t('اختيار الفروع للمقارنة','Choose branches to compare')}</summary><div className="mt-3 flex flex-wrap gap-4">{report.rows.map(r=><label key={r.id} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={!hidden.includes(r.id)} onChange={e=>setHidden(current=>e.target.checked?current.filter(id=>id!==r.id):[...current,r.id])}/>{r.name}{!r.active?` (${t('غير نشط','inactive')})`:''}</label>)}</div></details>
  {rows.length?<div className="overflow-x-auto rounded-2xl border" role="region" tabIndex={0} aria-label={t('جدول مقارنة الفروع','Branch comparison table')}><table className="w-full min-w-[850px] text-sm"><thead><tr>{headers.map(h=><th key={h} className="bg-teal-500/10 p-4 text-start" scope="col">{h}</th>)}</tr></thead><tbody>{doc.rows.map((row,i)=><tr key={rows[i].id} className="border-t">{row.map((cell,j)=><td key={j} className="p-4">{cell}</td>)}</tr>)}</tbody></table></div>:<p>{t('لا توجد فروع ضمن الاختيار. أضف فروع المنشأة من إعداداتها أو أظهر الفروع المخفية أعلاه.','No branches selected. Add business branches in settings or select them above.')}</p>}
  <p className="text-sm leading-7">{t('قارن فترات مكتملة قبل الحكم على الإكمال؛ مواعيد اليوم قد لم تنتهِ بعد. فرع بلا حجوزات لا يعني أنه بلا مبيعات.','Compare completed periods before judging completion; today’s appointments may still be pending. A branch with no bookings does not mean it has no sales.')}</p><div className="flex flex-wrap gap-3"><button disabled={!rows.length} className="min-h-11 rounded-xl border px-4" onClick={()=>downloadReport(doc)}>{t('تنزيل مقارنة الفروع','Download branch comparison')}</button><button disabled={!rows.length} className="min-h-11 rounded-xl border px-4" onClick={()=>{if(!printReport(doc,english))setError(t('اسمح بالنافذة المنبثقة للطباعة.','Allow the print popup.'));}}>{t('طباعة / PDF','Print / PDF')}</button></div></>:null}</section>;
}
