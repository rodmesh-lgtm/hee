"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function ContactPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-right dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="text-xs text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-indigo-700 dark:hover:text-indigo-300">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <span>التواصل</span>
          </nav>
          <div className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            قيد التطوير
          </div>
        </div>

        <h1 className="mt-4 text-3xl font-black">صفحة التواصل</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          فريق المنصة يعمل على إعداد صفحة تواصل متكاملة لحجز الجلسات التجريبية وطلبات الشراكة.
        </p>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </button>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
          >
            العودة للرئيسية
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
          >
            الذهاب إلى لوحة التحكم
          </Link>
        </div>
      </div>
    </main>
  );
}
