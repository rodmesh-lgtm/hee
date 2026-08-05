import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";

const links = [
  { label: "الرئيسية", href: "/dashboard" },
  { label: "صفحة النشاط", href: "/dashboard/business" },
  { label: "المنتجات والخدمات", href: "/dashboard/products" },
  { label: "الطلبات", href: "/dashboard/orders" },
  { label: "الحملات", href: "/dashboard/campaigns" },
  { label: "الإحصائيات", href: "/dashboard/analytics" },
  { label: "الإعدادات", href: "/dashboard/settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-slate-950/70 p-5 lg:border-b-0 lg:border-l">
          <div className="mb-6">
            <div className="text-2xl font-black">HEE</div>
            <div className="mt-1 text-sm text-slate-400">لوحة المتجر</div>
          </div>
          <nav className="space-y-2">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="block rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-indigo-400/40 hover:bg-indigo-500/10">
                {link.label}
              </a>
            ))}
          </nav>
        </aside>
        <section className="p-4 lg:p-8">{children}</section>
      </div>
    </main>
  );
}
