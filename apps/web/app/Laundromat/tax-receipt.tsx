"use client";

import { useMemo } from "react";
import QRCode from "qrcode";
import { CASHIER_VAT_RATE, cashierTaxNumber, cashierTaxQrPayload, type CashierTaxDocument } from "../lib/cashier-tax";

const issueTime = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "medium",
});

export function CashierTaxHeading({ document }: { document: CashierTaxDocument }) {
  return <>
    <h2>{document.sellerName}</h2>
    <p>{document.sellerAddress}</p>
    <h3>{document.originalNumber ? "إشعار دائن لفاتورة ضريبية مبسطة" : "فاتورة ضريبية مبسطة"}</h3>
    <p>رقم التسجيل الضريبي <bdi>{document.vatNumber}</bdi></p>
    <p>رقم المستند <bdi>{cashierTaxNumber(document.number)}</bdi></p>
    {document.originalNumber ? <p>مرجع الفاتورة الأصلية <bdi>{cashierTaxNumber(document.originalNumber)}</bdi></p> : null}
    <p>تاريخ الإصدار {issueTime.format(new Date(document.issuedAt))}</p>
  </>;
}

export function CashierTaxTotals({ document }: { document: CashierTaxDocument }) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(cashierTaxQrPayload(document), { errorCorrectionLevel: "M" });
    const path: string[] = [];
    for (let row = 0; row < modules.size; row++) {
      for (let column = 0; column < modules.size; column++) {
        if (modules.get(row, column)) path.push(`M${column + 4} ${row + 4}h1v1h-1z`);
      }
    }
    return { size: modules.size + 8, path: path.join("") };
  }, [document]);
  return <section aria-label="إجماليات الفاتورة الضريبية">
    <p>الإجمالي قبل الضريبة <bdi>{((document.gross - document.vat) / 100).toFixed(2)}</bdi> ر.س</p>
    <p>ضريبة القيمة المضافة ({CASHIER_VAT_RATE}٪) <bdi>{(document.vat / 100).toFixed(2)}</bdi> ر.س</p>
    <p>الإجمالي شامل الضريبة <bdi>{(document.gross / 100).toFixed(2)}</bdi> ر.س</p>
    <svg role="img" aria-label="رمز التحقق من بيانات الفاتورة الضريبية" width="144" height="144"
      viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className="ld-tax-qr">
      <rect width={size} height={size} fill="#fff"/>
      <path d={path} fill="#000"/>
    </svg>
  </section>;
}
