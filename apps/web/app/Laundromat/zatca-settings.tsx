"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ZatcaScope } from "../lib/cashier-zatca-document";
import { activateCashierZatca, connectCashierZatca } from "./zatca-actions";

export type CashierZatcaStatus = {
  configured: boolean;
  productionAvailable: boolean;
  simulationVerified: boolean;
  productionReady: boolean;
  active: boolean;
  expiresAt: string | null;
  reports: Array<{ number: number; status: "pending" | "reported" | "review"; resultCode: string | null; overdue: boolean }>;
};

export function CashierZatcaSettings({ businessId, status, taxNumberSaved, scope = "simplified" }: {
  businessId: string;
  status: CashierZatcaStatus;
  taxNumberSaved: boolean;
  scope?: ZatcaScope;
}) {
  const router = useRouter();
  const standard = scope === "standard";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; message: string }>();
  async function submit(event: FormEvent<HTMLFormElement>, action: "connect" | "activate") {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setMessage(undefined);
    try {
      const result = action === "activate"
        ? await activateCashierZatca({ businessId, scope, confirmed: fields.has("confirmed") })
        : await connectCashierZatca({ businessId, scope, environment: fields.get("environment"),
          otp: fields.get("otp"), address: Object.fromEntries(fields) });
      setMessage(result);
      if (action === "connect") {
        const otp = form.elements.namedItem("otp");
        if (otp instanceof HTMLInputElement) otp.value = "";
      }
      if (result.ok) router.refresh();
    } catch {
      setMessage({ ok: false, message: "تعذر الاتصال. تحقق من حالة جهاز الإصدار قبل إعادة المحاولة." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="ld-panel ld-branding">
    <div className="ld-panel-title"><h2>{standard ? "الربط مع منصة فاتورة · فواتير الشركات" : "الربط مع منصة فاتورة · المرحلة الثانية"}</h2>
      <span>{status.active ? standard ? "اعتماد فواتير الشركات مفعّل" : "الإصدار والإبلاغ مفعّلان" : status.productionReady ? "جهاز الإنتاج مسجّل" : "بانتظار تهيئة جهاز الإصدار"}</span>
    </div>
    <p className="ld-fine">{standard ? "جهاز مستقل لاعتماد فواتير الشركات وإشعاراتها الدائنة قبل مشاركتها." : "لإبلاغ المنصة بالفواتير المبسطة للأفراد وإشعاراتها الدائنة."} ابدأ بالمحاكاة، ثم سجّل جهاز الإنتاج باستخدام رمز تهيئة جديد عند نجاح المحاكاة.</p>
    {status.expiresAt ? <p>انتهاء شهادة الإنتاج {new Date(status.expiresAt).toLocaleDateString("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh" })}</p> : null}
    {status.simulationVerified ? <p className="ld-success">قبلت منصة المحاكاة فاتورة اختبار.</p> : null}
    {!status.configured || !taxNumberSaved ? <p className="ld-fine">{status.configured ? "احفظ بيانات البائع والرقم الضريبي أولًا." : "تهيئة بيئة الربط قيد الإعداد."}</p> : !status.productionReady ? <form onSubmit={event => void submit(event, "connect")}>
      <label>بيئة الربط<select name="environment" aria-label="بيئة الربط">
        <option value="simulation">المحاكاة</option>
        {status.productionAvailable && status.simulationVerified ? <option value="production">الإنتاج</option> : null}
      </select></label>
      <label>رقم السجل التجاري<input name="crNumber" inputMode="numeric" pattern="[0-9]{10}" dir="ltr" required/></label>
      <label>الشارع<input name="street" required maxLength={100}/></label>
      <label>الحي<input name="district" required maxLength={100}/></label>
      <label>المدينة<input name="city" required maxLength={100}/></label>
      <label>رقم المبنى<input name="building" inputMode="numeric" pattern="[0-9]{4}" dir="ltr" required/></label>
      <label>الرقم الإضافي<input name="additionalNumber" inputMode="numeric" pattern="[0-9]{4}" dir="ltr" required/></label>
      <label>الرمز البريدي<input name="postalCode" inputMode="numeric" pattern="[0-9]{5}" dir="ltr" required/></label>
      <label>رمز تهيئة الجهاز من فاتورة<input name="otp" type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{6}" dir="ltr" required/></label>
      <button className="ld-primary" disabled={busy}>{busy ? "جارٍ التحقق…" : "ربط جهاز الإصدار"}</button>
    </form> : status.productionAvailable && !status.active ? <form onSubmit={event => void submit(event, "activate")}>
      <label><input type="checkbox" name="confirmed" required/> {standard ? "أؤكد إصدار فواتير الشركات بأسعار شاملة لضريبة ١٥٪." : "أؤكد إصدار فواتير مبسطة للأفراد بأسعار شاملة لضريبة ١٥٪."}</label>
      <button className="ld-primary" disabled={busy}>{standard ? "تفعيل اعتماد فواتير الشركات" : "تفعيل إصدار المرحلة الثانية"}</button>
    </form> : null}
    {message ? <p role={message.ok ? "status" : "alert"} className={message.ok ? "ld-success" : "ld-alert"}>{message.message}</p> : null}
    {status.reports.length ? <ul>{status.reports.map(report => <li key={report.number}>
      {!standard || report.status === "reported"
        ? <a href={`/api/accounting/zatca/xml/${report.number}`}>XML — VAT-{String(report.number).padStart(6, "0")}</a>
        : <span>VAT-{String(report.number).padStart(6, "0")}</span>}
      {" · "}{report.status === "reported" ? standard ? "تم الاعتماد" : "تم الإبلاغ" : report.status === "review" ? "يلزم مراجعة المستند" : standard ? "قيد الاعتماد" : "قيد الإبلاغ"}
      {report.overdue ? " · تجاوز ٢٤ ساعة" : ""}{report.resultCode && report.resultCode !== "REPORTED" ? ` · ${report.resultCode}` : ""}
    </li>)}</ul> : null}
  </section>;
}
