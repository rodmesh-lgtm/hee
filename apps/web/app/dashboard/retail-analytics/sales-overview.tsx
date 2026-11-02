'use client';
import { useState } from 'react';
import { dailyShopifyReport, type ShopifyReport } from '../../lib/retail-analytics/shopify-report';
import ReportTable from './report-table';

export default function SalesOverview({ report, english, businessName, accountName }: { report: ShopifyReport; english: boolean; businessName: string; accountName: string }) {
  const t = (ar: string, en: string) => english ? en : ar;
  const [day, setDay] = useState('');
  const daily = dailyShopifyReport(report.orders);
  const dates: string[] = [];
  for (let time = Date.parse(report.from); time <= Date.parse(report.until) && dates.length < 31; time += 86400000) dates.push(new Date(time).toISOString().slice(0,10));
  const money = (n: number, currency: string, decimals: number) => new Intl.NumberFormat(english ? 'en' : 'ar-SA', { style: 'currency', currency }).format(n / 10 ** decimals);
  const orders = day ? report.orders.filter(o => new Date(Date.parse(o.createdAt) + 10800000).toISOString().slice(0,10) === day) : report.orders;
  return <section className="space-y-5" aria-label={t('نظرة شاملة على المبيعات','Sales overview')}>
    <p className="text-sm">{t('آخر قراءة ناجحة:','Last successful read:')} {new Date(report.fetchedAt).toLocaleString(english?'en-GB':'ar-SA',{timeZone:'Asia/Riyadh'})}</p><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl font-bold">{t('أداء المتجر يومًا بيوم','Store performance, day by day')}</h3><span className={`rounded-full px-3 py-2 text-sm ${report.complete ? 'bg-teal-500/10' : 'bg-amber-500/15'}`}>{report.complete ? t('الفترة مكتملة','Complete period') : t('قراءة جزئية — ليست إجمالي المتجر','Partial — not the full store total')}</span></div>
    {!report.orders.length ? <div className="rounded-2xl border border-dashed border-slate-500/30 p-7"><h4 className="font-bold">{t('لا توجد طلبات في الفترة المقروءة','No orders in the fetched period')}</h4><p className="mt-2">{t('ستظهر المؤشرات والحركة اليومية هنا عندما يرسل المتجر بيانات فعلية. يمكنك تغيير الفترة أعلاه.','Metrics and daily activity appear here when the store returns actual data. You can change the period above.')}</p></div> : null}
    {report.totals.map(total => {
      const maximum = Math.max(1, ...daily.filter(d => d.currency === total.currency).map(d => Math.abs(d.currentTotalMinor)));
      return <div key={total.currency} className="space-y-4"><h4 className="font-bold">{total.currency}</h4><dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        [t('قيمة الطلبات شاملة الضريبة','Order value incl. tax'), money(total.currentTotalMinor,total.currency,total.decimals)],
        [t('عدد الطلبات','Orders'), total.orders],
        [t('صافي مدفوعات الطلبات','Order net payments'), money(total.netPaymentsMinor,total.currency,total.decimals)],
        [t('المبالغ المستردة','Refunds'), money(total.refundedMinor,total.currency,total.decimals)],
      ].map(([label,value]) => <div key={label} className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5"><dt className="text-sm">{label}</dt><dd className="mt-3 break-words text-2xl font-bold tabular-nums">{value}</dd></div>)}</dl>
      <div className="rounded-2xl border border-slate-500/30 p-5"><h4 className="font-bold">{t('قيمة الطلبات حسب اليوم — اضغط اليوم لاستعراض طلباته','Order value by day — select a day to inspect its orders')}</h4><p className="mt-2 text-sm">{t('بتوقيت الرياض، حسب إنشاء الطلب؛ قيم الإلغاءات مستبعدة.','Riyadh time, by order creation; cancelled values excluded.')}</p><div className="mt-4 space-y-2">{dates.map(date => {
        const row = daily.find(d => d.day === date && d.currency === total.currency);
        const amount = row?.currentTotalMinor ?? 0;
        return <button key={date} aria-pressed={date===day} onClick={() => setDay(date===day?'':date)} className={`grid min-h-12 w-full grid-cols-[6rem_1fr] items-center gap-3 rounded-xl p-2 text-start sm:grid-cols-[7rem_1fr_10rem] ${day===date?'bg-teal-500/15 ring-1 ring-teal-500':'hover:bg-teal-500/5'}`}><span className="text-sm tabular-nums">{date}</span><span className="relative h-7 overflow-hidden rounded-md bg-slate-500/10"><span className="absolute inset-y-0 start-0 rounded-md bg-teal-600" style={{width:`${Math.abs(amount)/maximum*100}%`}}/></span><span className="col-span-2 text-sm font-bold tabular-nums sm:col-span-1">{row || report.complete ? money(amount,total.currency,total.decimals) : t('غير مكتمل','Incomplete')} · {row?.orders ?? 0} {t('طلب','orders')}</span></button>;
      })}</div></div></div>;
    })}
    {report.orders.length ? <><div className="grid gap-3 sm:grid-cols-3">{[[t('طلبات مدفوعة','Paid orders'),orders.filter(o=>!o.cancelled&&o.financialStatus==='PAID').length],[t('بانتظار التنفيذ','Awaiting fulfillment'),orders.filter(o=>!o.cancelled&&o.fulfillmentStatus==='UNFULFILLED').length],[t('طلبات ملغاة','Cancelled orders'),orders.filter(o=>o.cancelled).length]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-500/20 p-4"><p>{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}</div>
      <div className="flex items-center justify-between"><h4 className="font-bold">{day ? `${t('طلبات يوم','Orders on')} ${day}` : t('آخر الطلبات في الفترة','Latest orders in this period')}</h4>{day?<button className="min-h-11 underline" onClick={()=>setDay('')}>{t('إظهار كل الأيام','Show all days')}</button>:null}</div>
      <ReportTable english={english} report={{title:t('حركة الطلبات','Order activity'),metadata:[businessName,accountName,`${report.from} — ${report.until}`,day||t('كل الأيام','All days'),report.complete?t('فترة مكتملة','Complete period'):t('جزئي','Partial'),`${t('وقت القراءة','Fetched')}: ${report.fetchedAt}`],headers:[t('الطلب','Order'),t('التاريخ','Date'),t('القيمة الحالية','Current value')],rows:[...orders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(o=>[o.reference,new Date(o.createdAt).toLocaleString(english?'en-GB':'ar-SA',{timeZone:'Asia/Riyadh'}),money(o.currentTotalMinor,o.currency,o.decimals)])}}/>
    </> : null}
  </section>;
}
