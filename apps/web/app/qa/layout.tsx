import { notFound } from "next/navigation";
import type { ReactNode } from "react";

function isProductionRuntime() {
  const appEnv = String(process.env.APP_ENV ?? "").trim().toLowerCase();
  const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  return appEnv === "production" || vercelEnv === "production";
}

export default function QaLayout({ children }: { children: ReactNode }) {
  if (isProductionRuntime()) notFound();
  return children;
}
