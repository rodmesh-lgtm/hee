import type { Metadata } from "next";
import { requireAdmin } from "../lib/admin";

export const metadata: Metadata = {
  title: "إدارة HEE",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Protect the entire /admin subtree. Individual pages/actions may still call
  // requireAdmin defensively, but no future admin route can accidentally omit it.
  await requireAdmin();
  return children;
}
