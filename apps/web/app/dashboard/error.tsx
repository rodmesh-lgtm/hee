"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-[28px] border border-rose-200 bg-white p-6 text-slate-900 shadow-[0_12px_32px_-28px_rgba(58,35,75,.28)]">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#1f2552]">حدث خطأ داخل لوحة التحكم</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">يمكنك إعادة المحاولة الآن أو الرجوع إلى الصفحة الرئيسية للوحة.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset} size="sm" icon={<ArrowRight className="h-4 w-4" />} className="bg-[#6f3bd2] text-white hover:bg-[#5e31b8]">
          إعادة المحاولة
        </Button>
        <Button onClick={() => router.push("/dashboard")} variant="secondary" size="sm" className="border-[#e4def1] bg-white text-slate-700">
          العودة إلى لوحة التحكم
        </Button>
      </div>
    </div>
  );
}
