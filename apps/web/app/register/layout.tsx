import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "إنشاء حساب",
  robots: { index: false, follow: false, noarchive: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
