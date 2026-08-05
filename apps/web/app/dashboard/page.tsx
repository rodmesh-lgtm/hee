import Link from "next/link";
import { getCurrentUser } from "../lib/auth";
import { db } from "../lib/db";

export default async function DashboardHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: { products: true },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">مرحباً، {user.name}</p>
            <h1 className="text-3xl font-black">لوحة المتجر</h1>
          </div>
          <Link href="/dashboard/business" className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">تعديل النشاط</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-slate-400">اسم النشاط</div>
          <div className="mt-2 text-lg font-black">{business?.name ?? "لم يتم إنشاء نشاط"}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-slate-400">حالة الصفحة</div>
          <div className="mt-2 text-lg font-black">{business?.isPublished ? "منشورة" : "مسودة"}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-slate-400">عدد المنتجات</div>
          <div className="mt-2 text-lg font-black">{business?.products.length ?? 0}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-slate-400">رابط الصفحة</div>
          <div className="mt-2 text-lg font-black">{business ? `/b/${business.slug}` : "—"}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={business ? `/b/${business.slug}` : "/onboarding"} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold">فتح الصفحة العامة</Link>
        <Link href="/dashboard/business" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold">تعديل النشاط</Link>
        <Link href="/dashboard/products" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold">إضافة منتج</Link>
      </div>
    </div>
  );
}
