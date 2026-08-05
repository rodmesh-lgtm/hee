import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "الشروط والأحكام",
  description: "الشروط والأحكام لمنصة HEE.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-black">الشروط والأحكام</h1>
        <p className="mt-4 text-sm leading-8 text-slate-600">
          توضح هذه الصفحة شروط استخدام منصة HEE. استخدامك للخدمة يعني الالتزام بالأنظمة المحلية وسياسات المنصة وعدم إساءة الاستخدام.
        </p>
        <p className="mt-3 text-sm leading-8 text-slate-600">
          يحق للمنصة تحديث الشروط عند الحاجة، مع استمرار استخدامك للخدمة بعد التحديث كإقرار بالموافقة.
        </p>
        <div className="mt-6">
          <Link href="/" className="text-sm font-bold text-slate-900 underline underline-offset-4">العودة للرئيسية</Link>
        </div>
      </div>
    </main>
  );
}
