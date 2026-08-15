import { redirect } from "next/navigation";
import { Building2, Mail, MapPin, MessageCircle, Phone, Plus, Save, Trash2, Users } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { createBranchAction, createContactPersonAction, createDepartmentAction, deleteBranchAction, deleteContactPersonAction, deleteDepartmentAction } from "../../actions/business";

export default async function DirectoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: {
      branches: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      departments: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      contactPersons: { include: { branch: true, department: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!business) return <div className="rounded-2xl border border-slate-200 bg-white p-6">أنشئ نشاطك أولاً لإدارة دليل التواصل.</div>;

  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  const card = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

  return (
    <div className="space-y-5 pb-8" dir="rtl">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-5">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-white"><Users className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-slate-950">الفروع والأقسام وجهات الاتصال</h1><p className="mt-1 text-sm text-slate-600">أدر دليل التواصل الذي يظهر مباشرة في صفحة نشاطك العامة.</p></div></div>
      </div>

      <section className={card}>
        <div className="mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-600"/><h2 className="font-black text-slate-950">الفروع</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{business.branches.length}</span></div>
        <form action={createBranchAction} className="grid gap-2 md:grid-cols-4">
          <input className={field} name="name" required placeholder="اسم الفرع" />
          <input className={field} name="city" placeholder="المدينة" />
          <input className={field} name="district" placeholder="الحي" />
          <input className={field} name="phone" placeholder="الهاتف" dir="ltr" />
          <input className={field} name="whatsapp" placeholder="واتساب" dir="ltr" />
          <input className={`${field} md:col-span-2`} name="address" placeholder="العنوان" />
          <input className={field} name="googleMapsLink" placeholder="رابط Google Maps" dir="ltr" />
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="isMain"/> الفرع الرئيسي</label>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white"><Plus className="h-4 w-4"/> إضافة فرع</button>
        </form>
        <div className="mt-4 grid gap-2 md:grid-cols-2">{business.branches.map((branch) => <div key={branch.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"><div><div className="font-black text-slate-900">{branch.name} {branch.isMain ? <span className="mr-1 text-xs text-emerald-700">رئيسي</span> : null}</div><div className="mt-1 text-xs text-slate-500">{[branch.city, branch.district].filter(Boolean).join(" · ") || "بدون موقع"}</div></div><form action={deleteBranchAction}><input type="hidden" name="id" value={branch.id}/><button aria-label="حذف الفرع" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4"/></button></form></div>)}</div>
      </section>

      <section className={card}>
        <div className="mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600"/><h2 className="font-black text-slate-950">الأقسام</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{business.departments.length}</span></div>
        <form action={createDepartmentAction} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <input className={field} name="name" required placeholder="مثال: المبيعات" />
          <input className={field} name="description" placeholder="وصف مختصر للقسم" />
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white"><Plus className="h-4 w-4"/> إضافة قسم</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">{business.departments.map((department) => <div key={department.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><span className="text-sm font-black text-slate-800">{department.name}</span><form action={deleteDepartmentAction}><input type="hidden" name="id" value={department.id}/><button aria-label="حذف القسم" className="text-rose-500"><Trash2 className="h-3.5 w-3.5"/></button></form></div>)}</div>
      </section>

      <section className={card}>
        <div className="mb-4 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600"/><h2 className="font-black text-slate-950">جهات الاتصال</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{business.contactPersons.length}</span></div>
        <form action={createContactPersonAction} className="grid gap-2 md:grid-cols-3">
          <input className={field} name="name" required placeholder="اسم المسؤول" />
          <input className={field} name="jobTitle" placeholder="المسمى الوظيفي" />
          <select className={field} name="departmentId" defaultValue=""><option value="">بدون قسم</option>{business.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select className={field} name="branchId" defaultValue=""><option value="">بدون فرع</option>{business.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <input className={field} name="phone" placeholder="الهاتف" dir="ltr" />
          <input className={field} name="whatsapp" placeholder="واتساب" dir="ltr" />
          <input className={field} name="email" type="email" placeholder="البريد الإلكتروني" dir="ltr" />
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="isPrimary"/> جهة اتصال رئيسية</label>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white"><Save className="h-4 w-4"/> حفظ جهة الاتصال</button>
        </form>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">{business.contactPersons.map((contact) => <article key={contact.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 font-black text-emerald-700">{contact.name.slice(0,1)}</div><div className="min-w-0 flex-1"><div className="truncate font-black text-slate-900">{contact.name}</div><div className="mt-0.5 truncate text-xs text-slate-500">{[contact.jobTitle, contact.department?.name, contact.branch?.name].filter(Boolean).join(" · ")}</div><div className="mt-1 flex gap-3 text-xs text-slate-500">{contact.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3"/>{contact.phone}</span> : null}{contact.email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3"/>{contact.email}</span> : null}</div></div><form action={deleteContactPersonAction}><input type="hidden" name="id" value={contact.id}/><button aria-label="حذف جهة الاتصال" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4"/></button></form></article>)}</div>
      </section>
    </div>
  );
}
