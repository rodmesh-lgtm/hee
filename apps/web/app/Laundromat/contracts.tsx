"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { getLaundryContracts, laundryContractCommand } from "./contract-actions";
import type { LaundryContractRow, LaundrySignature } from "../lib/laundry-contract-domain";
import { laundryMoney as money } from "../lib/laundry-domain";

const statusNames = { draft: "بانتظار التوقيع", signed: "موقّع حضوريًا", cancelled: "ملغى" };
function SignaturePad({ value, onChange, disabled }: { value: LaundrySignature; onChange: (value: LaundrySignature) => void; disabled: boolean }) {
  const active = useRef<number | null>(null);
  const drawing = useRef<LaundrySignature>([]);
  function point(e: PointerEvent<SVGSVGElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.round(Math.max(0, Math.min(1000, (e.clientX - r.left) / r.width * 1000))), Math.round(Math.max(0, Math.min(300, (e.clientY - r.top) / r.height * 300)))];
  }
  return <div><p id="ld-signature-help" className="ld-fine">ليكتب العميل توقيعه بإصبعه أو القلم داخل الإطار، ثم يراجع اسمه ويوافق على العقد أدناه.</p><svg className="ld-signature-pad" role="img" aria-label="مساحة توقيع العميل" aria-describedby="ld-signature-help" viewBox="0 0 1000 300" preserveAspectRatio="none" onPointerDown={e => {
    if (disabled || active.current !== null || value.length >= 30) return;
    active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = [...value, [point(e)]]; onChange(drawing.current);
  }} onPointerMove={e => {
    if (disabled || active.current !== e.pointerId) return;
    const strokes = drawing.current, last = strokes[strokes.length - 1];
    if (!last || last.length >= 300) return;
    drawing.current = [...strokes.slice(0, -1), [...last, point(e)]]; onChange(drawing.current);
  }} onPointerUp={() => { active.current = null; }} onPointerCancel={() => { active.current = null; }}>
    {value.map((stroke, i) => <polyline key={i} points={stroke.map(p => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}
  </svg><button type="button" className="ld-outline" disabled={disabled} onClick={() => { active.current = null; drawing.current = []; onChange([]); }}>مسح التوقيع</button></div>;
}
function ContractDocument({ contract, logoUrl, busy, error, onClose, onSign, onCancel }: { contract: LaundryContractRow; logoUrl: string | null; busy: boolean; error: string; onClose: () => void; onSign: (data: Record<string, unknown>) => Promise<boolean>; onCancel: (reason: string) => Promise<boolean> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [signature, setSignature] = useState<LaundrySignature>([]);
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  return <div className="ld-overlay"><dialog className="ld-dialog" ref={dialog} aria-label="عقد خدمات المنشأة" onCancel={e => { if (busy) e.preventDefault(); }} onClose={onClose}>
    <div className="ld-dialog-tools"><button autoFocus className="ld-outline" disabled={busy} onClick={onClose}>إغلاق العقد</button><button className="ld-primary" onClick={() => window.print()}>طباعة العقد A4</button></div>
    <div className="ld-receipt a4 ld-contract-document">
      <p className="ld-eyebrow">INFRO / LAUNDRY</p>{logoUrl ? <Image unoptimized src={logoUrl} alt="شعار المنشأة" width={80} height={80} className="ld-receipt-logo"/> : null}
      <h2>{contract.businessName}</h2><h3>{contract.title}</h3><p>العقد #{contract.number} · المرجع {contract.reference} · {statusNames[contract.status]}</p>
      <p>العميل: {contract.customerName} · <span dir="ltr">{contract.customerPhone}</span></p><p>مدة العقد: {contract.startsOn} — {contract.endsOn}</p>
      <p>القيمة التعاقدية الإجمالية: <strong>{money(contract.amount)} ر.س</strong></p>
      <div className="ld-contract-terms">{contract.terms}</div>
      {contract.signature ? <><p>اسم الموقّع: {contract.signerName}</p><svg role="img" aria-label="التوقيع المحفوظ" viewBox="0 0 1000 300" className="ld-saved-signature">{contract.signature.map((stroke, i) => <polyline key={i} points={stroke.map(p => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="3"/>)}</svg><p>وقت التوقيع: {new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }).format(new Date(contract.signedAt!))}</p><p className="ld-fine">توقيع حضوري جُمع على جهاز المنشأة وأُرفق بهذه النسخة. لا يتضمن تحقق هوية عبر مزود توقيع معتمد.</p></> : <p>لم يُسجّل توقيع العميل على هذه النسخة.</p>}
      {contract.cancelledAt ? <p>سبب الإلغاء: {contract.cancelReason}</p> : null}
      <p className="ld-fine">بصمة نسخة العقد SHA-256: <span dir="ltr">{contract.digest}</span></p><p className="ld-fine">هذا العقد لا يثبت سدادًا ولا ينشئ فاتورة أو قيدًا محاسبيًا. تُسجل الخدمات والتحصيل في عملياتها المعتادة. لا تُضاف ضريبة.</p>
    </div>
    <div className="ld-dialog-bottom ld-contract-actions">
      {error ? <p role="alert" className="ld-alert">{error}</p> : null}
      {contract.status === "draft" ? <form onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); await onSign({ id: contract.id, digest: contract.digest, signature, signerName: String(f.get("signerName")), consent: f.get("consent") === "on" }); }}>
        <h3>توقيع العميل حضوريًا</h3><SignaturePad value={signature} onChange={setSignature} disabled={busy}/>
        <label>اسم الموقّع على العقد<input name="signerName" required minLength={2} maxLength={100} disabled={busy}/></label>
        <label className="ld-check-label"><input name="consent" type="checkbox" required disabled={busy}/>أنا العميل أو ممثله، قرأت هذه النسخة وأوافق على شروطها وعلى حفظ توقيعي معها</label>
        <button className="ld-primary" disabled={busy || !signature.length}>حفظ توقيع العميل</button>
      </form> : null}
      {contract.status !== "cancelled" ? <details><summary>إلغاء العقد مع حفظ سجله</summary><form onSubmit={async e => { e.preventDefault(); await onCancel(String(new FormData(e.currentTarget).get("reason"))); }}><label>سبب إلغاء العقد<textarea name="reason" required minLength={4} maxLength={500} disabled={busy}/></label><button className="ld-outline" disabled={busy}>تأكيد إلغاء العقد</button></form></details> : null}
    </div>
  </dialog></div>;
}
export function LaundryContracts({ businessId, business }: { businessId: string; business: { name: string; logoUrl: string | null } }) {
  const [rows, setRows] = useState<LaundryContractRow[]>([]), [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState({ query: "", status: "all" });
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const request = useRef<{ payload: string; id: string } | null>(null);
  useEffect(() => { let alive = true; getLaundryContracts({ businessId, query: "", status: "all" }).then(r => { if (alive) { if (r.ok) setRows(r.rows); else setError(r.error); } }).catch(() => { if (alive) setError("تعذر الاتصال بالعقود"); }); return () => { alive = false; }; }, [businessId]);
  async function run(type: string, data: Record<string, unknown>) {
    if (busy) return false;
    setBusy(true); setError(""); setMessage(""); const payload = JSON.stringify({ type, ...data });
    if (!request.current || request.current.payload !== payload) request.current = { id: crypto.randomUUID(), payload };
    try {
      const r = await laundryContractCommand({ businessId, requestId: request.current.id, type, ...data });
      if (!r.ok) { setError(r.error ?? "تعذر حفظ العقد"); return false; }
      request.current = null; setMessage("حُفظت عملية العقد في سجل المنشأة");
      // Keep the just-signed or cancelled document visible regardless of the old filter.
      const all = { query: "", status: "all" }; const updated = await getLaundryContracts({ businessId, ...all });
      if (updated.ok) { setRows(updated.rows); setFilter(all); } else { setSelected(null); setError(updated.error); }
      return true;
    } catch { setError("تعذر الاتصال؛ أعد المحاولة بنفس البيانات"); return false; } finally { setBusy(false); }
  }
  const contract = rows.find(r => r.id === selected);
  return <div className="ld-contracts"><section className="ld-panel"><h2>العقود والتوقيع الحضوري</h2><p className="ld-fine">أدخل الشروط المتفق عليها، ثم اعرض النسخة للعميل للتوقيع على جهاز المنشأة. تبقى الشروط ثابتة بعد إنشاء العقد؛ للتعديل ألغِ النسخة وأنشئ عقدًا بمرجع جديد.</p>
    {error && !contract ? <p role="alert" className="ld-alert">{error}</p> : null}{message ? <p role="status" className="ld-success">{message}</p> : null}
    <form className="ld-inline-form" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); setError(""); try { const r = await getLaundryContracts({ businessId, ...filter }); if (r.ok) setRows(r.rows); else setError(r.error); } catch { setError("تعذر البحث"); } finally { setBusy(false); } }}>
      <label>بحث العقود<input value={filter.query} onChange={e => setFilter({ ...filter, query: e.target.value })} maxLength={100}/></label><label>حالة العقد<select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}><option value="all">جميع الحالات</option>{Object.entries(statusNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label><button className="ld-outline" disabled={busy}>عرض العقود</button>
    </form><p className="ld-fine">آخر 100 عقد مطابق للبحث.</p><div className="ld-table-wrap"><table><thead><tr><th>العقد والعميل</th><th>المدة</th><th>القيمة</th><th>الحالة</th><th>المستند</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.reference} · {r.title}<small>{r.customerName}</small></td><td>{r.startsOn} — {r.endsOn}</td><td>{money(r.amount)}</td><td>{statusNames[r.status]}</td><td><button className="ld-outline" disabled={busy} onClick={() => { setError(""); setSelected(r.id); }}>فتح العقد {r.reference}</button></td></tr>)}</tbody></table></div>{!rows.length ? <p>لا توجد عقود مطابقة.</p> : null}
  </section><section className="ld-panel"><h2>إنشاء عقد خدمات</h2><form onSubmit={async e => { e.preventDefault(); const f = e.currentTarget; if (await run("create", Object.fromEntries(new FormData(f)))) f.reset(); }}>
    <fieldset disabled={busy} className="ld-contract-fields"><div className="ld-form-row"><label>مرجع العقد<input name="reference" required minLength={2} maxLength={80}/></label><label>عنوان العقد<input name="title" required minLength={4} maxLength={150}/></label></div>
      <div className="ld-form-row"><label>اسم عميل العقد<input name="customerName" required minLength={2} maxLength={100}/></label><label>جوال عميل العقد<input name="customerPhone" type="tel" required maxLength={40}/></label></div>
      <div className="ld-form-row"><label>بداية العقد<input name="startsOn" type="date" required/></label><label>نهاية العقد<input name="endsOn" type="date" required/></label></div>
      <label>القيمة التعاقدية الإجمالية — ريال<input name="amount" type="number" inputMode="decimal" min="0.01" max="100000" step="0.01" required/></label>
      <label>شروط العقد والخدمات المتفق عليها<textarea name="terms" required minLength={20} maxLength={12000} rows={8}/></label><button className="ld-primary">إنشاء نسخة العقد</button>
    </fieldset>
  </form></section>{contract ? <ContractDocument key={contract.id} contract={contract} logoUrl={business.logoUrl} busy={busy} error={error} onClose={() => setSelected(null)} onSign={data => run("sign", data)} onCancel={reason => run("cancel", { id: contract.id, reason })}/> : null}</div>;
}
