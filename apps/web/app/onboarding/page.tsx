import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { db } from "../lib/db";
import { OnboardingClient } from "../../components/onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existingBusiness = await db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    select: { id: true },
  });

  if (existingBusiness) redirect("/dashboard");

  const params = await searchParams;
  const email = Array.isArray(params?.email) ? params.email[0] : params?.email;

  return <div className="space-y-3">
    {email === "verification-sent" ? <div role="status" className="mx-auto max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">أرسلنا رابط تأكيد البريد تلقائيًا. يمكنك إكمال إعداد نشاطك الآن، وافتح الرسالة خلال 24 ساعة قبل نشر الصفحة أو الاشتراك المدفوع.</div> : null}
    {email === "verification-send-failed" ? <div role="alert" className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">تم إنشاء حسابك بنجاح، لكن تعذر إرسال رسالة تأكيد البريد الآن. أكمل إعداد النشاط، ثم استخدم «إعادة إرسال رسالة التأكيد» من الحساب والباقات.</div> : null}
    {email === "verification-unavailable" ? <div role="alert" className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">تم إنشاء حسابك، لكن خدمة تأكيد البريد غير متاحة في هذه البيئة. لن يُسمح بالنشر أو الدفع قبل نجاح تأكيد البريد.</div> : null}
    <OnboardingClient />
  </div>;
}
