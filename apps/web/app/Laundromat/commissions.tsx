"use client";
import { useState } from "react";
import { useI18n } from "../../components/i18n/locale-provider";
import { getCommissionReport } from "./commission-actions";
import { laundryMoney } from "../lib/laundry-domain";
import { laundryCsv } from "../lib/laundry-report";
import type { CommissionReport } from "../lib/cashier-commission";

export function CashierCommissions({ businessId }: { businessId: string }) {
  const { t, intlLocale } = useI18n();
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [period, setPeriod] = useState<{from:string;to:string;phone:string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
  const money = (value:number) => laundryMoney(value, intlLocale);
  async function load(input:{from:string;to:string;phone:string},page=0) {
    if (busy) return;
    setBusy(true); setError(""); setReport(null);
    try { const result = await getCommissionReport({businessId,...input,page}); if(result.ok){setReport(result.report);setPeriod(input);}else setError(result.error); }
    catch { setError("تعذر الاتصال. أعد المحاولة."); }
    finally { setBusy(false); }
  }
  function download() {
    if (!report || !period) return;
    const rows = [[t("عمولات الموظفين"), period.from, period.to], [t("اسم الموظف"),t("الجوال"),t("عدد الفواتير"),t("إجمالي العمولات بالريال")],...report.employees.map(row=>[row.name,row.phone,row.invoices,(row.amount/100).toFixed(2)])];
    const url=URL.createObjectURL(new Blob([laundryCsv(rows)],{type:"text/csv;charset=utf-8"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download=`INFRO-commissions-${period.from}-${period.to}.csv`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="ld-panel">
    <div className="ld-panel-title"><h2>{t("عمولات الموظفين")}</h2><span>{t("سجل خاص بالمنشأة")}</span></div>
    <p className="ld-fine">{t("اختر الفترة لعرض كل موظف وعمولاته المرتبطة بالفواتير. هذا سجل عمولات مسجلة وليس كشف صرف أو قيد مصروف محاسبي.")}</p>
    <form className="ld-inline-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void load({from:String(data.get("from")),to:String(data.get("to")),phone:String(data.get("phone")??"")});}}>
      <label>{t("من تاريخ")}<input name="from" type="date" required defaultValue={`${today.slice(0,7)}-01`}/></label>
      <label>{t("إلى تاريخ")}<input name="to" type="date" required defaultValue={today}/></label>
      <label>{t("جوال الموظف — اختياري")}<input name="phone" type="tel" dir="ltr" maxLength={40}/></label>
      <button className="ld-primary" disabled={busy}>{t(busy?"جارٍ إعداد التقرير…":"عرض العمولات")}</button>
    </form>
    {error?<p role="alert" className="ld-alert">{t(error)}</p>:null}
    {report && period ? <>
      <p className="ld-fine">{period.from} — {period.to} · {t("بتوقيت الرياض")}</p>
      <div className="ld-report-summary"><article><span>{t("عدد الموظفين")}</span><strong>{report.employees.length}</strong></article><article><span>{t("عدد الفواتير")}</span><strong>{report.count}</strong></article><article><span>{t("إجمالي العمولات")}</span><strong>{money(report.amount)} {t("ر.س")}</strong></article></div>
      <div className="ld-panel-title"><h3>{t("كل موظف وعمولته")}</h3><button type="button" className="ld-outline" onClick={download} disabled={!report.count}>{t("تصدير ملخص الموظفين CSV")}</button></div>
      <div className="ld-table-wrap"><table><thead><tr><th>{t("اسم الموظف")}</th><th>{t("الجوال")}</th><th>{t("عدد الفواتير")}</th><th>{t("العمولات بالريال")}</th></tr></thead><tbody>{report.employees.map(row=><tr key={row.phone}><td>{row.name}</td><td dir="ltr">{row.phone}</td><td>{row.invoices}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div>
      {!report.count?<p className="ld-empty">{t("لا توجد عمولات مسجلة في هذه الفترة")}</p>:<>
        <h3>{t("تفاصيل عمولات الفواتير")}</h3>
        <div className="ld-table-wrap"><table><thead><tr><th>{t("الفاتورة")}</th><th>{t("التاريخ")}</th><th>{t("الموظف")}</th><th>{t("الاتفاق")}</th><th>{t("إجمالي الفاتورة")}</th><th>{t("العمولة")}</th></tr></thead><tbody>{report.entries.map(row=><tr key={row.id}><td>#{row.number}</td><td>{new Intl.DateTimeFormat(intlLocale,{timeZone:"Asia/Riyadh",dateStyle:"short"}).format(new Date(row.createdAt))}</td><td>{row.name}<small dir="ltr">{row.phone}</small></td><td>{money(row.value)} {row.kind==="percent"?"٪":t("ر.س")}</td><td>{money(row.base)}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div>
        <div className="ld-dialog-tools"><button type="button" className="ld-outline" disabled={busy||report.page===0} onClick={()=>void load(period,report.page-1)}>{t("السابق")}</button><span>{report.page+1} / {Math.ceil(report.count/100)}</span><button type="button" className="ld-outline" disabled={busy||(report.page+1)*100>=report.count} onClick={()=>void load(period,report.page+1)}>{t("التالي")}</button></div>
      </>}
    </>:null}
  </section>;
}
