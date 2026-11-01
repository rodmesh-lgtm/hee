import { logoutAction } from "../actions/auth";
import { redirect } from "next/navigation";
import { getAuthenticatedAccountUser } from "../lib/auth";
import { reactivateOwnAccountAction } from "../actions/account-status";

export default async function AccountPausedPage() {
  const user = await getAuthenticatedAccountUser();
  if (!user) redirect("/login");
  if (!user.deactivatedAt) redirect("/dashboard/settings");
  return <main dir="rtl" className="mx-auto my-12 max-w-xl space-y-6 rounded-3xl border bg-white p-6 text-slate-900">
    <p className="font-bold">INFRO</p><h1 className="text-2xl font-black">حسابك معطّل مؤقتًا</h1>
    <p className="leading-8">بياناتك محفوظة. يمكنك استعادة الدخول بنفس الحساب. الصفحات والخدمات والتجديدات التي أوقفتها لن تعمل تلقائيًا.</p>
    <form action={reactivateOwnAccountAction} className="space-y-5"><label className="flex gap-3 leading-7"><input name="confirm" type="checkbox" required className="h-6 w-6 shrink-0"/>أرغب بإعادة تفعيل حسابي، وسأراجع النشر والخدمات والموظفين والاشتراك قبل تشغيلها.</label><button className="min-h-12 w-full rounded-xl bg-teal-900 px-5 font-bold text-white">إعادة تفعيل حسابي</button></form>
    <form action={logoutAction}><button className="min-h-11 font-bold underline">تسجيل الخروج</button></form>
  </main>;
}
