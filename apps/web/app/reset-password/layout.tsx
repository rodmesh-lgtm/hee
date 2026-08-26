import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تعيين كلمة مرور جديدة",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
