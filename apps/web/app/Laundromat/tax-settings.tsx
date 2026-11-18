"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CashierTaxProfile } from "../lib/cashier-tax";
import { saveCashierTaxProfile } from "./tax-actions";

export function CashierTaxSettings({ businessId, profile, phaseTwoActive }: { businessId: string; profile: CashierTaxProfile | null; phaseTwoActive: boolean }) {
  const router = useRouter();
  const modeId = useId();
  const [enabled, setEnabled] = useState(profile?.enabled ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(undefined);
    try {
      const result = await saveCashierTaxProfile({
        businessId,
        sellerName: fields.get("sellerName"),
        sellerAddress: fields.get("sellerAddress"),
        vatNumber: fields.get("vatNumber"),
        mode: enabled ? "retail_phase_one" : "disabled",
        confirmed: fields.has("confirmed"),
      });
      setMessage({ ok: result.ok, text: result.ok ? "تم حفظ إعدادات الفوترة الضريبية." : result.error ?? "تعذر الحفظ." });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ ok: false, text: "تعذر الاتصال. أعد المحاولة." });
    } finally {
      setSaving(false);
    }
  }

  return <section className="ld-panel ld-branding">
    <div className="ld-panel-title"><h2>الفوترة الضريبية · زاتكا</h2><span>{phaseTwoActive ? "إصدار المرحلة الثانية مفعّل" : profile?.enabled ? "الإصدار المبسط مفعّل" : "الإصدار المبسط متوقف"}</span></div>
    {phaseTwoActive ? <p>رقم التسجيل الضريبي <bdi>{profile?.vatNumber}</bdi></p> : <>
    <p className="ld-fine">للمنشآت المسجلة في الضريبة التي لم يحلّ موعد ربطها بمنصة فاتورة. يصدر الكاشير فاتورة ضريبية مبسطة للمستهلك عن المبيعات الجديدة الخاضعة للنسبة الأساسية. معاملات الباقات تحتاج مسار فوترة منفصل.</p>
    <form onSubmit={save}>
      <label>اسم البائع المسجّل<input name="sellerName" required maxLength={255} defaultValue={profile?.sellerName ?? ""}/></label>
      <label>عنوان البائع المسجّل<input name="sellerAddress" required maxLength={300} defaultValue={profile?.sellerAddress ?? ""}/></label>
      <label>رقم تسجيل ضريبة القيمة المضافة<input name="vatNumber" dir="ltr" inputMode="numeric" required maxLength={15} defaultValue={profile?.vatNumber ?? ""}/></label>
      <div><label htmlFor={modeId}>وضع الإصدار</label><select id={modeId} value={enabled ? "retail_phase_one" : "disabled"} onChange={event => setEnabled(event.target.value === "retail_phase_one")}>
        <option value="disabled">إيقاف إصدار الفواتير الضريبية</option>
        <option value="retail_phase_one">إصدار الفاتورة المبسطة · المرحلة الأولى</option>
      </select></div>
      {enabled ? <label><input type="checkbox" name="confirmed" required/> أؤكد أن المنشأة مسجلة بالضريبة، ولم يحل موعد ربطها بمنصة فاتورة، وأن أسعار الكاشير تشمل ضريبة ١٥٪ وتخص توريدات خاضعة لها.</label> : null}
      <button className="ld-primary" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ إعدادات الضريبة"}</button>
    </form>
    {message ? <p role={message.ok ? "status" : "alert"} className={message.ok ? "ld-success" : "ld-alert"}>{message.text}</p> : null}
    <p className="ld-fine">تجد إعدادات جهاز الإصدار للمرحلة الثانية أدناه.</p>
    </>}
  </section>;
}
