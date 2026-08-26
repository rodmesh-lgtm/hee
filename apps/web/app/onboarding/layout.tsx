import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "إعداد الهوية",
  robots: { index: false, follow: false, noarchive: true },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
