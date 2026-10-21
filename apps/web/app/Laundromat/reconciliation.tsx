"use client";
import { useEffect, useRef, useState } from "react";
import { confirmLaundryBank, getLaundryBank, getLaundryBankHistory, type BankHistoryRow } from "./reconciliation-actions";
import type { BankView } from "../lib/laundry-reconciliation";
import { laundryReconciliation, laundryBankBalance } from "../lib/laundry-reconciliation-domain";
import { laundryMoney as money } from "../lib/laundry-domain";
import { laundryCsv } from "../lib/laundry-report";

export function LaundryReconciliation({ businessId }: { businessId: string }) {
  const [query, setQuery] = useState<{ accountCode: string; date: string } | null>(null);
  const [view, setView] = useState<BankView | null>(null);
  const [history, setHistory] = useState<BankHistoryRow[]>([]);
  const [outstandingIds, setOutstandingIds] = useState<string[]>([]);
  const [statementBalance, setStatementBalance] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const requestId = useRef("");
  useEffect(() => {
    let alive = true;
    getLaundryBankHistory({ businessId }).then(r => { if (alive) { if (r.ok) setHistory(r.rows); else setError(r.error); } }).catch(() => { if (alive) setError("تعذر الاتصال بسجل المطابقة"); });
    return () => { alive = false; };
  }, [businessId]);
  let difference: number | null = null;
  if (view && statementBalance.trim()) {
    try {
      const amount = laundryBankBalance(statementBalance);
      difference = laundryReconciliation({ bookBalance: view.balance, statementBalance: amount, lines: view.lines, outstandingIds }).difference;
    } catch { /* The required decimal input remains editable until valid. */ }
  }
  function download(row: BankHistoryRow) {
    const data = [["INFRO — مطابقة حساب", row.accountCode, row.statementDate, row.reference], ["رصيد الدفتر", money(row.bookBalance)], ["رصيد الكشف", money(row.statementBalance)], ["حركات لم تظهر بالكشف", money(row.outstanding)], ["القيد", "التاريخ", "البيان", "مدين", "دائن", "المطابقة"], ...row.snapshot.lines.map(l => [l.number, l.effectiveAt, l.description, money(l.debit), money(l.credit), row.snapshot.outstandingIds.includes(l.id) ? "لم تظهر في الكشف" : "مطابقة"] )];
    const url = URL.createObjectURL(new Blob([laundryCsv(data)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `INFRO-reconciliation-${row.statementDate}-${row.accountCode}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div>
    <section className="ld-panel">
      <h2>التسوية البنكية</h2>
      <p className="ld-fine">طابق كشف البنك أو كشف تسوية الشبكة مع الحساب المقابل. أدخل الرسوم والعمليات الناقصة في اليومية، ثم أقفل الفترة قبل الاعتماد. لا تُنشئ المطابقة قيودًا مالية تلقائية.</p>
      {error ? <p role="alert" className="ld-alert">{error}</p> : null}
      {message ? <p role="status" className="ld-success">{message}</p> : null}
      <form className="ld-inline-form" onSubmit={async e => {
        e.preventDefault(); if (busy) return;
        const data = new FormData(e.currentTarget), next = { accountCode: String(data.get("accountCode")), date: String(data.get("date")) };
        setBusy(true); setError(""); setMessage(""); setView(null); setQuery(null);
        try { const r = await getLaundryBank({ businessId, ...next }); if (r.ok) { setView(r.view); setQuery(next); setOutstandingIds(r.view.lines.map(l => l.id)); setStatementBalance(""); requestId.current = ""; } else setError(r.error); }
        catch { setError("تعذر الاتصال؛ أعد تحميل الكشف"); } finally { setBusy(false); }
      }}>
        <label>حساب المطابقة<select name="accountCode"><option value="1120">1120 — التحويلات المسجلة</option><option value="1110">1110 — تحصيل الشبكة قيد التسوية</option></select></label>
        <label>تاريخ نهاية كشف البنك<input name="date" type="date" required /></label>
        <button className="ld-primary" disabled={busy}>تحميل حركات المطابقة</button>
      </form>
      {view && query ? <form onSubmit={async e => {
        e.preventDefault(); if (busy) return;
        const form = e.currentTarget, data = new FormData(form);
        requestId.current ||= crypto.randomUUID(); setBusy(true); setError("");
        try {
          const r = await confirmLaundryBank({ businessId, ...query, requestId: requestId.current, statementBalance, reference: String(data.get("reference")), outstandingIds });
          if (!r.ok) { setError(r.error ?? "تعذر الاعتماد"); return; }
          setMessage("اعتُمدت المطابقة وحُفظت حركاتها للمراجعة"); setView(null); setQuery(null); requestId.current = "";
          const updated = await getLaundryBankHistory({ businessId }); if (updated.ok) setHistory(updated.rows); else setError(updated.error);
        } catch { setError("تعذر الاتصال؛ أعد المحاولة بنفس البيانات"); } finally { setBusy(false); }
      }}>
        <h3>كشف {query.date} · الحساب {query.accountCode}</h3>
        {!view.locked ? <p className="ld-alert">الفترة مفتوحة. راجع العمليات وأقفلها من دفتر المحاسبة، ثم أعد تحميل الحركات لاعتماد المطابقة.</p> : null}
        <div className="ld-form-row"><label>مرجع كشف البنك<input name="reference" required minLength={2} maxLength={120} disabled={busy}/></label><label>رصيد نهاية الكشف — ريال<input type="number" inputMode="decimal" step="0.01" required value={statementBalance} onChange={e => setStatementBalance(e.target.value)} disabled={busy}/></label></div>
        <div className="ld-report-summary"><article><span>رصيد الدفتر</span><strong>{money(view.balance)} ر.س</strong></article><article><span>فرق المطابقة</span><strong>{difference === null ? "أدخل رصيد الكشف" : `${money(difference)} ر.س`}</strong></article></div>
        <p className="ld-fine">حدد «ظهرت بالكشف» فقط للحركات التي تحققت منها. الحركات غير المحددة تبقى معلقة للمطابقة التالية. الحركات المطابقة سابقًا لا تتكرر هنا.</p>
        <div className="ld-table-wrap"><table className="ld-ledger-table"><thead><tr><th>ظهرت بالكشف</th><th>القيد والبيان</th><th>مدين</th><th>دائن</th></tr></thead><tbody>{view.lines.map(l => <tr key={l.id}><td><input type="checkbox" aria-label={`مطابقة القيد ${l.number} ${l.description}`} disabled={busy} checked={!outstandingIds.includes(l.id)} onChange={e => setOutstandingIds(ids => e.target.checked ? ids.filter(id => id !== l.id) : [...ids, l.id])}/></td><td>#{l.number} · {l.description}<small>{new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh" }).format(new Date(l.effectiveAt))}</small></td><td>{money(l.debit)}</td><td>{money(l.credit)}</td></tr>)}</tbody></table></div>
        {!view.lines.length ? <p>لا توجد حركات غير مطابقة حتى هذا التاريخ.</p> : null}
        <label className="ld-check-label"><input type="checkbox" required disabled={busy}/>راجعت الكشف والحركات؛ اعتماد المطابقة يحفظ سجلًا لا يمكن تعديله</label>
        <button className="ld-primary" disabled={busy || !view.locked || difference !== 0}>اعتماد المطابقة المتوازنة</button>
      </form> : null}
    </section>
    <section className="ld-panel"><h2>المطابقات المعتمدة</h2><p className="ld-fine">آخر 50 مطابقة. التصدير يشمل تفاصيل الحركات وقت الاعتماد.</p>{!history.length ? <p>لم تُعتمد مطابقات بعد.</p> : <div className="ld-table-wrap"><table className="ld-ledger-table"><thead><tr><th>التاريخ والحساب</th><th>المرجع</th><th>رصيد الكشف</th><th>رصيد الدفتر</th><th>التفاصيل</th></tr></thead><tbody>{history.map(r => <tr key={r.id}><td>{r.statementDate}<small>{r.accountCode}</small></td><td>{r.reference}</td><td>{money(r.statementBalance)}</td><td>{money(r.bookBalance)}</td><td><button className="ld-outline" onClick={() => download(r)}>تصدير المطابقة CSV</button></td></tr>)}</tbody></table></div>}</section>
  </div>;
}
