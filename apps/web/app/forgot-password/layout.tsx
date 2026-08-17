import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
