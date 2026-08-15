import { notFound } from "next/navigation";
import { isPreviewQaEnvironment } from "../lib/qa-audit";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (!isPreviewQaEnvironment()) {
    notFound();
  }

  return children;
}
