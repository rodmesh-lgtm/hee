"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { completeWhatsAppEmbeddedSignupAction, startWhatsAppEmbeddedSignupAction } from "../../../actions/whatsapp";
import { createSignupAttempt, signupErrorMessage } from "../../../lib/whatsapp/embedded-signup-client";

declare global {
  interface Window {
    FB?: {
      init(input: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }): void;
      login(callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>): void;
    };
  }
}

function loginForCode(configId: string) {
  return new Promise<string>((resolve, reject) => {
    window.FB?.login((response) => {
      const code = response.authResponse?.code;
      if (code) resolve(code); else reject(new Error("META_CODE_MISSING"));
    }, {
      config_id: configId,
      response_type: "code",
      override_default_response_type: true,
      extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
    });
  });
}

export function EmbeddedSignupButton({ appId, configId, graphVersion, purpose = "marketing" }: { appId: string; configId: string; graphVersion: string; purpose?: "marketing" | "booking" }) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const launch = () => startTransition(async () => {
    setMessage(null);
    if (!sdkReady || !window.FB) { setMessage("تعذر تحميل واجهة Meta. حاول مجددًا."); return; }
    const attempt = createSignupAttempt(window);
    try {
      // FB.login must run in the original click activation. Awaiting a server
      // round trip first makes browsers treat Meta's window as an unsolicited
      // popup and silently blocks Embedded Signup.
      const assetsPromise = attempt.assets;
      const authorizationCodePromise = loginForCode(configId);
      const sessionPromise = startWhatsAppEmbeddedSignupAction(purpose).then((session) => {
        if (!session.ok) throw new Error("META_SESSION_FAILED");
        return session;
      });
      const [session, authorizationCode, assets] = await Promise.race([
        Promise.all([sessionPromise, authorizationCodePromise, assetsPromise]), attempt.expired,
      ]);
      const result = await completeWhatsAppEmbeddedSignupAction({ state: session.state, authorizationCode, purpose, ...assets });
      setMessage(result.ok ? `تم التحقق من الرقم وتعيينه لخدمة ${purpose === "booking" ? "الحجوزات" : "التسويق"}.` : result.error === "asset-assigned" ? "هذه الأصول مرتبطة بنشاط آخر." : result.error === "asset-invalid" ? "الرقم لا يتبع حساب WABA المحدد." : "لم يكتمل الربط. يمكنك المحاولة مجددًا بأمان.");
      if (result.ok) router.refresh();
    } catch (error) {
      setMessage(signupErrorMessage(error));
    } finally {
      attempt.dispose();
    }
  });

  return <div className="min-w-0" aria-busy={pending}>
    <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" onError={() => { setSdkReady(false); setMessage("تعذر تحميل Meta. تحقق من الاتصال والسماح لخدمات Facebook في المتصفح ثم حدّث الصفحة."); }} onReady={() => { window.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version: graphVersion }); setSdkReady(Boolean(window.FB)); }} />
    <button type="button" onClick={launch} disabled={!sdkReady || pending} className="infro-primary-action inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#07181b] px-5 text-xs font-black text-white transition hover:bg-[#0d2a2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none">
      {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}{pending ? "جارٍ التحقق والربط…" : sdkReady ? "ربط حساب Meta" : "جارٍ تجهيز Meta…"}
    </button>
    {message ? <p role="status" aria-live="polite" className="mt-3 break-words rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] font-bold leading-5 text-slate-600">{message}</p> : null}
  </div>;
}
