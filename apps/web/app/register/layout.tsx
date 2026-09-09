import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "إنشاء حساب",
  robots: { index: false, follow: false, noarchive: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f4f8f8]" />}>{children}</Suspense>;
}
