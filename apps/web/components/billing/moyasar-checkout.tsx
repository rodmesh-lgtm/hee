"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Moyasar?: {
      init(config: Record<string, unknown>): void;
    };
  }
}

type Props = {
  amount: number;
  publishableKey: string;
  callbackUrl: string;
  billingId: string;
  businessId: string;
  description: string;
};

const MOYASAR_JS = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.js";
const MOYASAR_CSS = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.css";

export function MoyasarCheckout({ amount, publishableKey, callbackUrl, billingId, businessId, description }: Props) {
  const initialized = useRef(false);
  const [accepted, setAccepted] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!accepted || !scriptReady || initialized.current || !window.Moyasar) return;
    initialized.current = true;

    try {
      window.Moyasar.init({
        element: "#hee-moyasar-form",
        amount,
        currency: "SAR",
        description,
        publishable_api_key: publishableKey,
        callback_url: callbackUrl,
        supported_networks: ["mada", "visa", "mastercard"],
        methods: ["creditcard"],
        language: "ar",
        fixed_width: false,
        metadata: {
          hee_billing_id: billingId,
          hee_business_id: businessId,
        },
        credit_card: {
          save_card: true,
        },
        on_completed: async (payment: { id?: unknown }) => {
          const paymentId = typeof payment?.id === "string" ? payment.id : "";
          if (!paymentId) return;
          try {
            const response = await fetch("/api/billing/moyasar/created", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ billingId, paymentId }),
            });
            if (!response.ok) console.error("[billing-checkout] payment_record_failed", { status: response.status });
          } catch {
            console.error("[billing-checkout] payment_record_unavailable");
          }
        },
      });
    } catch (error) {
      initialized.current = false;
      console.error("[billing-checkout] moyasar_init_failed", error);
      window.setTimeout(() => setLoadFailed(true), 0);
    }
  }, [accepted, amount, billingId, businessId, callbackUrl, description, publishableKey, scriptReady]);

  if (!accepted) {
    return <div className="rounded-2xl border border-[#ddd8f4] bg-[#faf9ff] p-4 text-sm leading-7 text-slate-700">
      <b className="block text-[#252a4a]">قبل فتح نموذج الدفع</b>
      <ul className="mt-2 list-disc space-y-1 pr-5 text-xs leading-6 text-slate-600">
        <li>أنت تراجع اشتراكًا مدفوعًا قد يتجدد شهريًا عند حفظ وسيلة دفع صالحة.</li>
        <li>يمكن إيقاف التجديد من إدارة الاشتراك، وتبقى الفترة المدفوعة فعالة حتى نهايتها.</li>
        <li>الإلغاء لا يعني استردادًا تلقائيًا؛ تطبق حقوق الاسترداد النظامية والشروط السارية عند الشراء.</li>
      </ul>
      <p className="mt-3 text-xs leading-6 text-slate-500">بالمتابعة أنت تقر بمراجعة <Link href="/terms" className="font-black text-[#5d49cc] underline underline-offset-4">الشروط والأحكام</Link> و<Link href="/privacy" className="font-black text-[#5d49cc] underline underline-offset-4">سياسة الخصوصية</Link>.</p>
      <button type="button" onClick={() => setAccepted(true)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5b3fd6] px-5 text-xs font-black text-white">أوافق وأتابع للدفع الآمن</button>
    </div>;
  }

  return <>
    <link rel="stylesheet" href={MOYASAR_CSS} />
    <Script
      src={MOYASAR_JS}
      strategy="afterInteractive"
      onLoad={() => setScriptReady(true)}
      onError={() => setLoadFailed(true)}
    />
    {loadFailed ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">تعذر تحميل نموذج الدفع الآمن. لم يتم خصم أي مبلغ. حاول مرة أخرى بعد قليل.</div> : null}
    {!loadFailed && !scriptReady ? <div role="status" className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">جاري تحميل بوابة الدفع الآمنة…</div> : null}
    <div id="hee-moyasar-form" className={loadFailed ? "hidden" : "min-h-[260px]"} />
  </>;
}
