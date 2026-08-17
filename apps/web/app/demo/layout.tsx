import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPreviewQaEnvironment } from "../lib/qa-audit";

export const metadata: Metadata = {
  title: "صفحة نموذجية | HEE",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (!isPreviewQaEnvironment()) {
    notFound();
  }

  return children;
}
