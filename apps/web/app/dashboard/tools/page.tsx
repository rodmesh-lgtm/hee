import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { Card } from "../../../components/ui/card";

export default async function DashboardToolsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: { plan: true },
  });

  const designerAvailable = Boolean(business?.plan?.aiEnabled);

  return (
    <div className="space-y-6">
      <Card className="space-y-3 bg-slate-950/75" hoverLift={false}>
        <h1 className="text-3xl font-black text-white">أدوات HEE</h1>
        <p className="text-sm text-slate-300">أدوات إضافية تساعدك في تطوير حضور نشاطك الرقمي.</p>
      </Card>

      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">
          {designerAvailable ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>
        <h2 className="text-2xl font-black text-white">مصمم العروض</h2>
        <p className="text-sm leading-7 text-slate-300">أنشئ تصاميم عروض احترافية لنشاطك باستخدام هويتك وبيانات صفحتك.</p>

        {designerAvailable ? (
          <Link href="/dashboard/tools/offers" className="inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white">
            فتح مصمم العروض
          </Link>
        ) : (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-100">
              <Lock className="h-3.5 w-3.5" />
              متاح ضمن الباقة المؤهلة
            </div>
            <Link href="/dashboard/settings" className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 text-sm font-bold text-white">
              ترقية الباقة
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
