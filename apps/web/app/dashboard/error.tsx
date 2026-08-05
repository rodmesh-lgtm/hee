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
    <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-white">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black">حدث خطأ داخل لوحة التحكم</h2>
          <p className="max-w-2xl text-sm leading-7 text-red-100/80">يمكنك إعادة المحاولة الآن أو الرجوع إلى المسار الرئيسي للوحة.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset} size="sm" icon={<ArrowRight className="h-4 w-4" />}>
          إعادة المحاولة
        </Button>
        <Button onClick={() => router.push("/dashboard")} variant="secondary" size="sm">
          العودة إلى لوحة التحكم
        </Button>
      </div>
    </div>
  );
}
