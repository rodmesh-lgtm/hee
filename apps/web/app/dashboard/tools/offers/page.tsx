import Link from "next/link";
import { headers } from "next/headers";
import { Lock, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { OfferDesigner } from "../../../../components/dashboard/offer-designer";
import { Card } from "../../../../components/ui/card";
import { getCurrentUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

export default async function DashboardOffersDesignerPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: { plan: true },
  });

  if (!business) {
    return (
      <Card className="space-y-3 border-dashed bg-slate-950/75" hoverLift={false}>
        <h1 className="text-2xl font-black text-white">مصمم العروض</h1>
        <p className="text-sm text-slate-300">أنشئ نشاطك أولاً لتفعيل مصمم العروض.</p>
        <Link href="/dashboard/my-page" className="inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white">
          إكمال إنشاء صفحتي
        </Link>
      </Card>
    );
  }

  const designerAvailable = Boolean(business.plan?.aiEnabled);
  if (!designerAvailable) {
    return (
      <Card className="space-y-5 bg-slate-950/75" hoverLift={false}>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-black text-white">مصمم العروض</h1>
        <p className="text-sm leading-7 text-slate-300">هذه الأداة متاحة ضمن الباقة المؤهلة. قم بترقية باقتك لتفعيل تصميم العروض وتحميلها.</p>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-100">
          <Lock className="h-3.5 w-3.5" />
          متاح ضمن الباقة المؤهلة
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/settings" className="inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white">
            ترقية الباقة
          </Link>
          <Link href="/dashboard/tools" className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 text-sm font-bold text-white">
            العودة للأدوات
          </Link>
        </div>
      </Card>
    );
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "hee.sa";
  const protocol = host.includes("localhost") ? "http" : "https";
  const publicUrl = `${protocol}://${host}/b/${business.slug}`;

  return (
    <div className="space-y-6">
      <Card className="space-y-3 bg-slate-950/75" hoverLift={false}>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-black text-white">مصمم العروض</h1>
        <p className="text-sm text-slate-300">أنشئ عرضاً بصيغة مربعة 1080×1080 باستخدام هوية نشاطك، ثم حمّله كصورة PNG.</p>
      </Card>

      <OfferDesigner
        businessName={business.name}
        logoUrl={business.logoUrl}
        primaryColor={business.primaryColor}
        phone={business.phone}
        whatsapp={business.whatsapp}
        publicUrl={publicUrl}
      />
    </div>
  );
}