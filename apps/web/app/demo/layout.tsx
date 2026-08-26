import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "صفحة نموذجية",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
