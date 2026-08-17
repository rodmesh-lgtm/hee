import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Building2, CheckCircle2, ExternalLink, Mail, MessageCircle, Pencil, Phone, Plus, Save, Users } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { getPlanEntitlements, formatPlanLimit, limitReached } from "../../lib/plan-entitlements";
import { createBranchAction, createContactPersonAction, createDepartmentAction, deleteBranchAction, deleteContactPersonAction, deleteDepartmentAction, updateBranchAction, updateContactPersonAction, updateDepartmentAction } from "../../actions/directory";
import { ConfirmSubmitButton } from "../../../components/dashboard/confirm-submit-button";

const STATUS_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  "branch-created": { tone: "success", text: "تمت إضافة الفرع بنجاح." },
  "branch-updated": { tone: "success", text: "تم تحديث بيانات الفرع." },
  "branch-deleted": { tone: "success", text: "تم حذف الفرع وتحديث الفرع الرئيسي عند الحاجة." },
  "department-created": { tone: "success", text: "تمت إضافة القسم بنجاح." },
  "department-updated": { tone: "success", text: "تم تحديث القسم." },
  "department-deleted": { tone: "success", text: "تم حذف القسم. جهات الاتصال المرتبطة بقيت محفوظة بدون قسم." },
  "contact-created": { tone: "success", text: "تمت إضافة جهة الاتصال بنجاح." },
  "contact-updated": { tone: "success", text: "تم تحديث جهة الاتصال." },
  "contact-deleted": { tone: "success", text: "تم حذف جهة الاتصال وتحديث جهة الاتصال الرئيسية عند الحاجة." },
  "error-business": { tone: "error", text: "تعذر العثور على النشاط المرتبط بالحساب." },
  "error-required": { tone: "error", text: "يرجى تعبئة الحقول المطلوبة قبل الحفظ." },
  "error-not-found": { tone: "error", text: "تعذر العثور على السجل المطلوب أو أنه لا يتبع نشاطك." },
  "error-relation": { tone: "error", text: "تعذر الحفظ لأن الفرع أو القسم المحدد لا يتبع نشاطك." },
  "error-plan-branch-limit": { tone: "error", text: "وصلت إلى الحد الأقصى للفروع في باقتك الحالية. يمكنك الترقية لإضافة فروع أخرى." },
  "error-plan-department-limit": { tone: "error", text: "وصلت إلى الحد الأقصى للأقسام في باقتك الحالية. يمكنك الترقية لإضافة أقسام أخرى." },
  "error-plan-contact-limit": { tone: "error", text: "وصلت إلى الحد الأقصى لممثلي التواصل والمبيعات في باقتك الحالية. يمكنك الترقية لزيادة العدد." },
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const statusKey = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const status = statusKey ? STATUS_MESSAGES[statusKey] : null;

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: {
      plan: true,
      branches: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      departments: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      contactPersons: { include: { branch: true, department: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!business) return <div className="rounded-2xl border border-slate-200 bg-white p-6">أنشئ نشاطك أولاً لإدارة دليل التواصل.</div>;

  const entitlements = getPlanEntitlements(business.plan?.code);
  const branchLimitReached = limitReached(business.branches.length, entitlements.branchLimit);
  const departmentLimitReached = limitReached(business.departments.length, entitlements.departmentLimit);
  const contactLimitReached = limitReached(business.contactPersons.length, entitlements.contactLimit);
  const field = "min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  const card = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
  const saveButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300";

  return (
    <div className="space-y-5 pb-8" dir="rtl">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white"><Users className="h-5 w-5" /></span>
            <div><h1 className="text-lg font-black text-slate-950 sm:text-xl">الفروع والأقسام وجهات الاتصال</h1><p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">أدر دليل التواصل الذي يظهر مباشرة في صفحة نشاطك العامة.</p></div>
          </div>
          {business.isPublished ? <Link href={`/${business.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700"><ExternalLink className="h-4 w-4"/> معاينة الصفحة العامة</Link> : <Link href="/dashboard/my-page" className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-700">العودة إلى صفحتي</Link>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600"><span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5">الباقة: {entitlements.label}</span><span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5">الفروع {business.branches.length}/{formatPlanLimit(entitlements.branchLimit)}</span><span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5">الأقسام {business.departments.length}/{formatPlanLimit(entitlements.departmentLimit)}</span><span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5">الفريق {business.contactPersons.length}/{formatPlanLimit(entitlements.contactLimit)}</span><Link href="/dashboard/branding" className="rounded-full bg-[#5b3fd6] px-3 py-1.5 text-white">عرض الباقات</Link></div>
      </div>

      {status ? <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${status.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{status.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>}<span>{status.text}</span></div> : null}

      <section className={card}>
        <div className="mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-600"/><h2 className="font-black text-slate-950">الفروع</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{business.branches.length}/{formatPlanLimit(entitlements.branchLimit)}</span></div>
        {branchLimitReached ? <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold text-violet-800"><span>استخدمت الحد المتاح للفروع في باقتك.</span><Link href="/dashboard/branding" className="rounded-lg bg-violet-700 px-3 py-2 text-white">ترقية الباقة</Link></div> : null}
        <form action={createBranchAction} className="grid gap-2 md:grid-cols-4">
          <input className={field} name="name" required placeholder="اسم الفرع" disabled={branchLimitReached}/><input className={field} name="city" placeholder="المدينة" disabled={branchLimitReached}/><input className={field} name="district" placeholder="الحي" disabled={branchLimitReached}/><input className={field} name="phone" placeholder="الهاتف" dir="ltr" disabled={branchLimitReached}/><input className={field} name="whatsapp" placeholder="واتساب" dir="ltr" disabled={branchLimitReached}/><input className={`${field} md:col-span-2`} name="address" placeholder="العنوان" disabled={branchLimitReached}/><input className={field} name="googleMapsLink" placeholder="رابط Google Maps" dir="ltr" disabled={branchLimitReached}/><label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="isMain" disabled={branchLimitReached}/> الفرع الرئيسي</label><button className={saveButton} disabled={branchLimitReached}><Plus className="h-4 w-4"/> إضافة فرع</button>
        </form>
        <p className="mt-2 text-[11px] text-slate-500">أول فرع يُنشأ يصبح الفرع الرئيسي تلقائياً. لتغيير الفرع الرئيسي، فعّل خيار «رئيسي» في فرع آخر.</p>
        <div className="mt-4 space-y-2">
          {business.branches.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">لا توجد فروع بعد. أضف الفرع الرئيسي أولاً.</div> : business.branches.map(branch => (
            <details key={branch.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 open:bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-black text-slate-900">{branch.name}{branch.isMain ? <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">رئيسي</span>:null}{!branch.isActive ? <span className="mr-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">مخفي</span>:null}</div><div className="mt-1 truncate text-xs text-slate-500">{[branch.city,branch.district].filter(Boolean).join(" · ")||"بدون موقع"}</div></div><span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-emerald-700"><Pencil className="h-3.5 w-3.5"/> تعديل</span></summary>
              <form action={updateBranchAction} className="mt-4 grid gap-2 border-t border-slate-100 pt-4 md:grid-cols-4"><input type="hidden" name="id" value={branch.id}/><input className={field} name="name" required defaultValue={branch.name}/><input className={field} name="city" defaultValue={branch.city ?? ""}/><input className={field} name="district" defaultValue={branch.district ?? ""}/><input className={field} name="phone" dir="ltr" defaultValue={branch.phone ?? ""}/><input className={field} name="whatsapp" dir="ltr" defaultValue={branch.whatsapp ?? ""}/><input className={`${field} md:col-span-2`} name="address" defaultValue={branch.address ?? ""}/><input className={field} name="googleMapsLink" dir="ltr" defaultValue={branch.googleMapsLink ?? ""}/><input className={field} type="number" name="sortOrder" defaultValue={branch.sortOrder} placeholder="الترتيب"/><label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="isMain" defaultChecked={branch.isMain}/> رئيسي</label><label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="isActive" defaultChecked={branch.isActive}/> ظاهر</label><button className={saveButton}><Save className="h-4 w-4"/> حفظ التعديل</button></form>
              <form action={deleteBranchAction} className="mt-3"><input type="hidden" name="id" value={branch.id}/><ConfirmSubmitButton confirmMessage={`سيتم حذف الفرع «${branch.name}». جهات الاتصال المرتبطة ستبقى بدون فرع. هل تريد المتابعة؟`} /></form>
            </details>
          ))}
        </div>
      </section>

      <section className={card}>
        <div className="mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600"/><h2 className="font-black text-slate-950">الأقسام</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{business.departments.length}/{formatPlanLimit(entitlements.departmentLimit)}</span></div>
        {departmentLimitReached ? <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold text-violet-800">وصلت إلى حد الأقسام في باقتك الحالية.</div> : null}
        <form action={createDepartmentAction} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]"><input className={field} name="name" required placeholder="مثال: المبيعات" disabled={departmentLimitReached}/><input className={field} name="description" placeholder="وصف مختصر للقسم" disabled={departmentLimitReached}/><button className={saveButton} disabled={departmentLimitReached}><Plus className="h-4 w-4"/> إضافة قسم</button></form>
        <div className="mt-4 space-y-2">{business.departments.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">لا توجد أقسام بعد. أنشئ أقساماً مثل المبيعات وخدمة العملاء.</div> : business.departments.map(department => (
          <details key={department.id} className="rounded-xl border border-slate-200 p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div className="min-w-0"><span className="text-sm font-black text-slate-800">{department.name}</span>{!department.isActive ? <span className="mr-2 text-[10px] text-slate-500">مخفي</span>:null}<p className="mt-1 truncate text-xs text-slate-500">{department.description || "بدون وصف"}</p></div><Pencil className="h-4 w-4 shrink-0 text-emerald-600"/></summary><form action={updateDepartmentAction} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 md:grid-cols-[1fr_2fr_120px_auto_auto]"><input type="hidden" name="id" value={department.id}/><input className={field} name="name" required defaultValue={department.name}/><input className={field} name="description" defaultValue={department.description ?? ""}/><input className={field} type="number" name="sortOrder" defaultValue={department.sortOrder}/><label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={department.isActive}/> ظاهر</label><button className={saveButton}>حفظ</button></form><form action={deleteDepartmentAction} className="mt-3"><input type="hidden" name="id" value={department.id}/><ConfirmSubmitButton confirmMessage={`سيتم حذف قسم «${department.name}». المسؤولون المرتبطون سيبقون بدون قسم. هل تريد المتابعة؟`} /></form></details>
        ))}</div>
      </section>

      <section className={card}>
        <div className="mb-4 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600"/><h2 className="font-black text-slate-950">جهات الاتصال</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{business.contactPersons.length}/{formatPlanLimit(entitlements.contactLimit)}</span></div>
        {contactLimitReached ? <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold text-violet-800"><span>وصلت إلى عدد ممثلي المبيعات والتواصل المتاح في باقتك.</span><Link href="/dashboard/branding" className="rounded-lg bg-violet-700 px-3 py-2 text-white">زيادة الحد</Link></div> : null}
        <form action={createContactPersonAction} className="grid gap-2 md:grid-cols-3"><input className={field} name="name" required placeholder="اسم المسؤول" disabled={contactLimitReached}/><input className={field} name="jobTitle" placeholder="المسمى الوظيفي" disabled={contactLimitReached}/><select className={field} name="departmentId" defaultValue="" disabled={contactLimitReached}><option value="">بدون قسم</option>{business.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><select className={field} name="branchId" defaultValue="" disabled={contactLimitReached}><option value="">بدون فرع</option>{business.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><input className={field} name="phone" placeholder="الهاتف" dir="ltr" disabled={contactLimitReached}/><input className={field} name="whatsapp" placeholder="واتساب" dir="ltr" disabled={contactLimitReached}/><input className={field} name="email" type="email" placeholder="البريد الإلكتروني" dir="ltr" disabled={contactLimitReached}/><input className={field} name="imageUrl" placeholder="رابط الصورة (اختياري)" dir="ltr" disabled={contactLimitReached}/><label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="isPrimary" disabled={contactLimitReached}/> جهة اتصال رئيسية</label><button className={saveButton} disabled={contactLimitReached}><Save className="h-4 w-4"/> حفظ جهة الاتصال</button></form>
        <p className="mt-2 text-[11px] text-slate-500">أول جهة اتصال تصبح رئيسية تلقائياً. ويمكنك نقل صفة «رئيسي» إلى مسؤول آخر لاحقاً.</p>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">{business.contactPersons.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500 lg:col-span-2">لا توجد جهات اتصال بعد. أضف مسؤولاً واحداً على الأقل ليظهر دليل التواصل في الصفحة العامة.</div> : business.contactPersons.map(contact=>(
          <details key={contact.id} className="rounded-xl border border-slate-200 p-3"><summary className="flex cursor-pointer list-none items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 font-black text-emerald-700">{contact.name.slice(0,1)}</div><div className="min-w-0 flex-1"><div className="truncate font-black text-slate-900">{contact.name}{contact.isPrimary ? <span className="mr-2 text-[10px] text-emerald-700">رئيسي</span>:null}{!contact.isActive ? <span className="mr-2 text-[10px] text-slate-500">مخفي</span>:null}</div><div className="mt-0.5 truncate text-xs text-slate-500">{[contact.jobTitle,contact.department?.name,contact.branch?.name].filter(Boolean).join(" · ") || "بدون ربط"}</div><div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">{contact.phone?<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3"/>{contact.phone}</span>:null}{contact.email?<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3"/>{contact.email}</span>:null}</div></div><Pencil className="h-4 w-4 shrink-0 text-emerald-600"/></summary><form action={updateContactPersonAction} className="mt-4 grid gap-2 border-t border-slate-100 pt-4 md:grid-cols-3"><input type="hidden" name="id" value={contact.id}/><input className={field} name="name" required defaultValue={contact.name}/><input className={field} name="jobTitle" defaultValue={contact.jobTitle ?? ""}/><select className={field} name="departmentId" defaultValue={contact.departmentId ?? ""}><option value="">بدون قسم</option>{business.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><select className={field} name="branchId" defaultValue={contact.branchId ?? ""}><option value="">بدون فرع</option>{business.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><input className={field} name="phone" dir="ltr" defaultValue={contact.phone ?? ""}/><input className={field} name="whatsapp" dir="ltr" defaultValue={contact.whatsapp ?? ""}/><input className={field} name="email" type="email" dir="ltr" defaultValue={contact.email ?? ""}/><input className={field} name="imageUrl" dir="ltr" defaultValue={contact.imageUrl ?? ""}/><input className={field} type="number" name="sortOrder" defaultValue={contact.sortOrder}/><label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" name="isPrimary" defaultChecked={contact.isPrimary}/> رئيسي</label><label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={contact.isActive}/> ظاهر</label><button className={saveButton}>حفظ التعديل</button></form><form action={deleteContactPersonAction} className="mt-3"><input type="hidden" name="id" value={contact.id}/><ConfirmSubmitButton confirmMessage={`سيتم حذف جهة الاتصال «${contact.name}». هل تريد المتابعة؟`} /></form></details>
        ))}</div>
      </section>
    </div>
  );
}
