import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description: "سياسة الخصوصية لمنصة HEE.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-black">سياسة الخصوصية</h1>
        <p className="mt-4 text-sm leading-8 text-slate-600">
          نلتزم في HEE بحماية بياناتك واستخدامها لتقديم الخدمة وتحسينها فقط. يتم حفظ بيانات الحساب والنشاط التجاري بشكل آمن وفق أفضل الممارسات التقنية المتاحة.
        </p>
        <p className="mt-3 text-sm leading-8 text-slate-600">
          باستخدامك المنصة فإنك توافق على معالجة البيانات اللازمة لتشغيل حسابك وصفحتك العامة وتقديم مزايا التواصل مع العملاء.
        </p>
        <div className="mt-6">
          <Link href="/" className="text-sm font-bold text-slate-900 underline underline-offset-4">العودة للرئيسية</Link>
        </div>
      </div>
    </main>
  );
}
