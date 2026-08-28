"use client";

import Script from "next/script";
import { useState, useTransition } from "react";
import { completeWhatsAppEmbeddedSignupAction, startWhatsAppEmbeddedSignupAction } from "../../../actions/whatsapp";

declare global {
  interface Window {
    FB?: {
      init(input: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }): void;
      login(callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>): void;
    };
  }
}

type Assets = { wabaId: string; phoneNumberId: string };
const META_MESSAGE_ORIGINS = new Set(["https://www.facebook.com", "https://business.facebook.com"]);

function waitForEmbeddedSignupAssets() {
  return new Promise<Assets>((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("META_ASSET_EVENT_TIMEOUT")); }, 120_000);
    const onMessage = (event: MessageEvent) => {
      if (!META_MESSAGE_ORIGINS.has(event.origin)) return;
      let payload: unknown = event.data;
      if (typeof payload === "string") {
        if (payload.length > 10_000) return;
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (!payload || typeof payload !== "object") return;
      const item = payload as { type?: unknown; event?: unknown; data?: { waba_id?: unknown; phone_number_id?: unknown } };
      if (item.type !== "WA_EMBEDDED_SIGNUP") return;
      if (item.event === "CANCEL" || item.event === "ERROR") { cleanup(); reject(new Error("META_SIGNUP_CANCELLED")); return; }
      if (item.event !== "FINISH") return;
      const wabaId = typeof item.data?.waba_id === "string" ? item.data.waba_id : "";
      const phoneNumberId = typeof item.data?.phone_number_id === "string" ? item.data.phone_number_id : "";
      if (!/^\d{1,32}$/.test(wabaId) || !/^\d{1,32}$/.test(phoneNumberId)) return;
      cleanup(); resolve({ wabaId, phoneNumberId });
    };
    function cleanup() { window.clearTimeout(timeout); window.removeEventListener("message", onMessage); }
    window.addEventListener("message", onMessage);
  });
}

function loginForCode(configId: string) {
  return new Promise<string>((resolve, reject) => {
    window.FB?.login((response) => {
      const code = response.authResponse?.code;
      if (code) resolve(code); else reject(new Error("META_CODE_MISSING"));
    }, { config_id: configId, response_type: "code", override_default_response_type: true, extras: { setup: {} } });
  });
}

export function EmbeddedSignupButton({ appId, configId, graphVersion }: { appId: string; configId: string; graphVersion: string }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const launch = () => startTransition(async () => {
    setMessage(null);
    if (!sdkReady || !window.FB) { setMessage("تعذر تحميل واجهة Meta. حاول مجددًا."); return; }
    const session = await startWhatsAppEmbeddedSignupAction();
    if (!session.ok) { setMessage("تعذر إنشاء جلسة ربط آمنة."); return; }
    try {
      const assetsPromise = waitForEmbeddedSignupAssets();
      const [authorizationCode, assets] = await Promise.all([loginForCode(configId), assetsPromise]);
      const result = await completeWhatsAppEmbeddedSignupAction({ state: session.state, authorizationCode, ...assets });
      setMessage(result.ok ? "تم التحقق من WABA والرقم وربطهما بنشاطك." : result.error === "asset-assigned" ? "هذه الأصول مرتبطة بنشاط آخر." : result.error === "asset-invalid" ? "الرقم لا يتبع حساب WABA المحدد." : "لم يكتمل الربط. يمكنك المحاولة مجددًا بأمان.");
    } catch {
      setMessage("أُلغي التسجيل أو لم تُرجع Meta بيانات الربط المكتملة.");
    }
  });

  return <div>
    <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" onReady={() => { window.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version: graphVersion }); setSdkReady(Boolean(window.FB)); }} />
    <button type="button" onClick={launch} disabled={!sdkReady || pending} className="min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? "جارٍ التحقق والربط…" : "ربط حساب Meta"}</button>
    {message ? <p role="status" className="mt-3 text-xs font-bold text-slate-600">{message}</p> : null}
  </div>;
}
