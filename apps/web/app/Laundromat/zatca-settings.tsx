"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ZatcaBuyer, ZatcaScope } from "../lib/cashier-zatca-document";
import { activateCashierZatca, connectCashierZatca, reissueCashierZatca, renewCashierZatca } from "./zatca-actions";

import { ZatcaBuyerFields } from "./zatca-buyer-fields";

type Correction = { uuid: string; buyer: ZatcaBuyer & { supplyDate?: string }; credit: boolean };

export type CashierZatcaStatus = {
  accountingReady: boolean;
  configured: boolean;
  productionAvailable: boolean;
  simulationVerified: boolean;
  productionReady: boolean;
  active: boolean;
  expiresAt: string | null;
  renewing: boolean;
  certificateExpired: boolean;
  reports: Array<{ number: number; status: "pending" | "reported" | "review"; resultCode: string | null; overdue: boolean; correction?: Correction | null }>;
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
  async function correctReport(event: FormEvent<HTMLFormElement>, number: number, correction: Correction) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await reissueCashierZatca({ businessId, number, expectedUuid: correction.uuid, correction: correction.credit
        ? { kind: "credit", reason: values.get("creditReason") }
        : { kind: "invoice", buyer: {
          name: values.get("zatcaBuyerName"), vatNumber: values.get("zatcaBuyerVat"), supplyDate: values.get("zatcaSupplyDate"),
          street: values.get("zatcaBuyerStreet"), district: values.get("zatcaBuyerDistrict"), city: values.get("zatcaBuyerCity"),
          region: values.get("zatcaBuyerRegion"), building: values.get("zatcaBuyerBuilding"),
          additionalNumber: values.get("zatcaBuyerAdditional"), postalCode: values.get("zatcaBuyerPostal"),
        } } });
      setMessage(result);
      router.refresh();
    } catch {
      setMessage({ ok: false, message: "تعذر الاتصال. حدّث حالة المستند قبل إعادة المحاولة." });
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>, action: "connect" | "activate" | "renew") {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setMessage(undefined);
    try {
      const result = action === "activate"
        ? await activateCashierZatca({ businessId, scope, confirmed: fields.has("confirmed") })
        : action === "renew" ? await renewCashierZatca({ businessId, scope, otp: fields.get("otp") })
        : await connectCashierZatca({ businessId, scope, environment: fields.get("environment"),
          otp: fields.get("otp"), address: Object.fromEntries(fields) });
      setMessage(result);
      if (action !== "activate") {
        const otp = form.elements.namedItem("otp");
        if (otp instanceof HTMLInputElement) otp.value = "";
      }
      if (result.ok || action === "renew") router.refresh();
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
    <ol className="ld-fine" aria-label="خطوات الربط">
      <li>{taxNumberSaved ? "بيانات البائع — محفوظة" : "احفظ بيانات البائع والرقم الضريبي أعلاه"}</li>
      <li>{status.accountingReady ? "دفتر المحاسبة — جاهز" : "هيّئ دفتر المحاسبة من الإدارة المالية"}</li>
      <li>{status.simulationVerified ? "المحاكاة — نجحت" : "اربط جهاز المحاكاة برمز التهيئة"}</li>
      <li>{status.productionReady ? "جهاز الإنتاج — مسجّل" : "اربط جهاز الإنتاج برمز تهيئة مستقل"}</li>
      <li>{status.active ? "الإصدار — مفعّل" : "فعّل الإصدار بعد تسجيل جهاز الإنتاج"}</li>
    </ol>
    <p className="ld-fine"><a href="https://fatoora.zatca.gov.sa/" target="_blank" rel="noreferrer">افتح بوابة فاتورة للحصول على رمز التهيئة</a></p>
    {status.expiresAt ? <p>انتهاء شهادة الإنتاج {new Date(status.expiresAt).toLocaleDateString("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh" })}</p> : null}
    {status.renewing ? <p role="status">تجديد الشهادة قيد التحقق. الإصدار موقوف لهذا الجهاز حتى تأكيد النتيجة.</p>
      : status.certificateExpired ? <p role="status">انتهت شهادة الإنتاج. راجع حالة جهاز الإصدار في بوابة فاتورة.</p>
      : status.productionReady && status.productionAvailable && status.expiresAt ? <details>
        <summary>تجديد شهادة الإنتاج</summary>
        <form onSubmit={event => void submit(event, "renew")}>
          <label>رمز تجديد الجهاز<input name="otp" type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{6}" dir="ltr" required/></label>
          <button type="submit" className="ld-primary" disabled={busy}>تجديد الشهادة</button>
        </form>
      </details> : null}
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
      <button className="ld-primary" disabled={busy || !status.accountingReady}>{standard ? "تفعيل اعتماد فواتير الشركات" : "تفعيل إصدار المرحلة الثانية"}</button>
    </form> : null}
    {message ? <p role={message.ok ? "status" : "alert"} className={message.ok ? "ld-success" : "ld-alert"}>{message.message}</p> : null}
    {status.reports.length ? <ul>{status.reports.map(report => <li key={report.number}>
      {!standard || report.status === "reported"
        ? <a href={`/api/accounting/zatca/xml/${report.number}`}>XML — VAT-{String(report.number).padStart(6, "0")}</a>
        : <span>VAT-{String(report.number).padStart(6, "0")}</span>}
      {" · "}{report.status === "reported" ? standard ? "تم الاعتماد" : "تم الإبلاغ" : report.status === "review" ? "يلزم مراجعة المستند" : standard ? "قيد الاعتماد" : "قيد الإبلاغ"}
      {report.overdue ? " · تجاوز ٢٤ ساعة" : ""}{report.resultCode && report.resultCode !== "REPORTED" ? ` · ${report.resultCode}` : ""}
      {report.correction ? <details key={report.correction.uuid}>
        <summary>تصحيح المستند وإعادة إرساله</summary>
        <form onSubmit={event => void correctReport(event, report.number, report.correction!)}>
          {report.correction.credit
            ? <label>سبب الإشعار الدائن<textarea name="creditReason" minLength={4} maxLength={300} required/></label>
            : <ZatcaBuyerFields required initial={report.correction.buyer}/>}
          <button type="submit" className="ld-primary" disabled={busy}>إعادة طلب الاعتماد</button>
        </form>
      </details> : null}
    </li>)}</ul> : null}
  </section>;
}
