import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Building2, CheckCircle2, Eye, Pencil, Plus, Save, UsersRound } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { formatPlanLimit, getPlanEntitlements, limitReached } from "../../lib/plan-entitlements";
import { createBranchAction, createContactPersonAction, deleteBranchAction, deleteContactPersonAction, updateBranchAction, updateContactPersonAction } from "../../actions/directory";
import { ConfirmSubmitButton } from "../../../components/dashboard/confirm-submit-button";

const STATUS_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  "branch-created": { tone: "success", text: "تمت إضافة الفرع." },
  "branch-updated": { tone: "success", text: "تم تحديث الفرع." },
  "branch-deleted": { tone: "success", text: "تم حذف الفرع." },
  "contact-created": { tone: "success", text: "تمت إضافة عضو الفريق." },
  "contact-updated": { tone: "success", text: "تم تحديث عضو الفريق." },
  "contact-deleted": { tone: "success", text: "تم حذف عضو الفريق." },
  "error-required": { tone: "error", text: "أكمل الحقول المطلوبة." },
  "error-plan-branch-limit": { tone: "error", text: "وصلت إلى حد الفروع في باقتك الحالية." },
  "error-plan-contact-limit": { tone: "error", text: "وصلت إلى حد أعضاء الفريق في باقتك الحالية." },
  "error-not-found": { tone: "error", text: "تعذر العثور على السجل المطلوب." },
  "error-relation": { tone: "error", text: "تعذر ربط البيانات بالفرع المحدد." },
  "error-business": { tone: "error", text: "تعذر العثور على نشاطك." },
};

const field = "h-10 min-w-0 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm text-[#252a4a] outline-none focus:border-[#b7a9ef] focus:bg-white";
const save = "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#6f3bd2] px-3 text-xs font-black text-white disabled:bg-slate-300";

export default async function DirectoryPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const statusKey = Array.isArray(params?.status) ? params.status[0] : params?.status;
  const status = statusKey ? STATUS_MESSAGES[statusKey] : null;

  const business = await db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    include: {
      plan: true,
      branches: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      contactPersons: { include: { branch: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!business) redirect("/onboarding");

  const entitlements = getPlanEntitlements(business.plan?.code);
  const branchLimitReached = limitReached(business.branches.length, entitlements.branchLimit);
  const contactLimitReached = limitReached(business.contactPersons.length, entitlements.contactLimit);

  return <div className="space-y-4 pb-4">
    {status ? <div className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${status.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{status.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}{status.text}</div> : null}

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-black text-[#20264f]">الفروع والفريق</h1><p className="mt-1 text-sm text-slate-500">أضف الأشخاص والأماكن التي يحتاج عميلك للوصول إليها. لا حاجة لإنشاء أقسام إدارية.</p></div><Link href="/preview" target="_blank" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#ddd8f4] bg-[#f8f6ff] px-3 text-xs font-black text-[#5d49cc]"><Eye className="h-3.5 w-3.5" />معاينة</Link></div>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">الفروع</h2></div><span className="text-[10px] font-bold text-slate-400">{business.branches.length}/{formatPlanLimit(entitlements.branchLimit)}</span></div>
      {branchLimitReached ? <div className="mt-3 rounded-xl bg-[#f7f4ff] px-3 py-2 text-xs font-bold text-[#5d49cc]">استخدمت حد الفروع. <Link href="/dashboard/settings" className="underline">عرض الباقات</Link></div> : <form action={createBranchAction} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input name="name" required placeholder="اسم الفرع" className={field} /><input name="city" placeholder="المدينة" className={field} /><input name="district" placeholder="الحي" className={field} /><input name="googleMapsLink" placeholder="رابط Google Maps" dir="ltr" className={field} /><input name="address" placeholder="العنوان (اختياري)" className={`${field} sm:col-span-2`} /><input name="phone" placeholder="هاتف الفرع (اختياري)" dir="ltr" className={field} /><input name="whatsapp" placeholder="واتساب الفرع (اختياري)" dir="ltr" className={field} /><button className={`${save} sm:w-fit`}><Plus className="h-4 w-4" />إضافة فرع</button></form>}
      <div className="mt-4 space-y-2">{business.branches.length ? business.branches.map((branch) => <details key={branch.id} className="rounded-2xl border border-[#eceef6] bg-[#fbfcff] p-3 open:bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm text-[#252a4a]">{branch.name}{branch.isMain ? <span className="mr-2 rounded-full bg-[#f1edff] px-2 py-0.5 text-[9px] text-[#5d49cc]">الرئيسي</span> : null}</b><span className="mt-0.5 block truncate text-[10px] text-slate-400">{[branch.city, branch.district].filter(Boolean).join("، ") || "بدون موقع"}</span></div><span className="inline-flex items-center gap-1 text-[10px] font-black text-[#5d49cc]"><Pencil className="h-3.5 w-3.5" />تعديل</span></summary><form action={updateBranchAction} className="mt-3 grid gap-2 border-t border-[#eef0f6] pt-3 sm:grid-cols-2 lg:grid-cols-4"><input type="hidden" name="id" value={branch.id} /><input type="hidden" name="sortOrder" value={branch.sortOrder} /><input name="name" required defaultValue={branch.name} className={field} /><input name="city" defaultValue={branch.city ?? ""} className={field} /><input name="district" defaultValue={branch.district ?? ""} className={field} /><input name="googleMapsLink" defaultValue={branch.googleMapsLink ?? ""} dir="ltr" className={field} /><input name="address" defaultValue={branch.address ?? ""} className={`${field} sm:col-span-2`} /><input name="phone" defaultValue={branch.phone ?? ""} dir="ltr" className={field} /><input name="whatsapp" defaultValue={branch.whatsapp ?? ""} dir="ltr" className={field} /><label className="flex h-10 items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isMain" defaultChecked={branch.isMain} />رئيسي</label><label className="flex h-10 items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isActive" defaultChecked={branch.isActive} />ظاهر</label><button className={save}><Save className="h-3.5 w-3.5" />حفظ</button></form><form action={deleteBranchAction} className="mt-2"><input type="hidden" name="id" value={branch.id} /><ConfirmSubmitButton confirmMessage={`حذف الفرع «${branch.name}»؟`} /></form></details>) : <p className="rounded-2xl border border-dashed border-[#e1deeb] p-5 text-center text-xs text-slate-400">لا توجد فروع بعد.</p>}</div>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">فريق التواصل</h2></div><span className="text-[10px] font-bold text-slate-400">{business.contactPersons.length}/{formatPlanLimit(entitlements.contactLimit)}</span></div>
      <p className="mt-1 text-xs text-slate-500">ممثل مبيعات، خدمة عملاء، مدير عمليات أو أي شخص تريد إظهاره للعميل.</p>
      {contactLimitReached ? <div className="mt-3 rounded-xl bg-[#f7f4ff] px-3 py-2 text-xs font-bold text-[#5d49cc]">استخدمت حد أعضاء الفريق. <Link href="/dashboard/settings" className="underline">عرض الباقات</Link></div> : <form action={createContactPersonAction} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input name="name" required placeholder="الاسم" className={field} /><input name="jobTitle" placeholder="المسمى الوظيفي" className={field} /><input name="whatsapp" placeholder="واتساب" dir="ltr" className={field} /><input name="phone" placeholder="الهاتف (اختياري)" dir="ltr" className={field} /><select name="branchId" className={field}><option value="">كل الفروع / بدون فرع</option>{business.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><input name="email" type="email" placeholder="البريد (اختياري)" dir="ltr" className={field} /><button className={`${save} sm:w-fit`}><Plus className="h-4 w-4" />إضافة عضو</button></form>}
      <div className="mt-4 space-y-2">{business.contactPersons.length ? business.contactPersons.map((contact) => <details key={contact.id} className="rounded-2xl border border-[#eceef6] bg-[#fbfcff] p-3 open:bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm text-[#252a4a]">{contact.name}</b><span className="mt-0.5 block truncate text-[10px] text-slate-400">{contact.jobTitle || "فريق التواصل"}{contact.branch ? ` · ${contact.branch.name}` : ""}</span></div><span className="inline-flex items-center gap-1 text-[10px] font-black text-[#5d49cc]"><Pencil className="h-3.5 w-3.5" />تعديل</span></summary><form action={updateContactPersonAction} className="mt-3 grid gap-2 border-t border-[#eef0f6] pt-3 sm:grid-cols-2 lg:grid-cols-4"><input type="hidden" name="id" value={contact.id} /><input type="hidden" name="sortOrder" value={contact.sortOrder} /><input type="hidden" name="imageUrl" value={contact.imageUrl ?? ""} /><input name="name" required defaultValue={contact.name} className={field} /><input name="jobTitle" defaultValue={contact.jobTitle ?? ""} className={field} /><input name="whatsapp" defaultValue={contact.whatsapp ?? ""} dir="ltr" className={field} /><input name="phone" defaultValue={contact.phone ?? ""} dir="ltr" className={field} /><select name="branchId" defaultValue={contact.branchId ?? ""} className={field}><option value="">كل الفروع / بدون فرع</option>{business.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><input name="email" type="email" defaultValue={contact.email ?? ""} dir="ltr" className={field} /><label className="flex h-10 items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isPrimary" defaultChecked={contact.isPrimary} />رئيسي</label><label className="flex h-10 items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isActive" defaultChecked={contact.isActive} />ظاهر</label><button className={save}><Save className="h-3.5 w-3.5" />حفظ</button></form><form action={deleteContactPersonAction} className="mt-2"><input type="hidden" name="id" value={contact.id} /><ConfirmSubmitButton confirmMessage={`حذف «${contact.name}» من فريق التواصل؟`} /></form></details>) : <p className="rounded-2xl border border-dashed border-[#e1deeb] p-5 text-center text-xs text-slate-400">لا يوجد أعضاء فريق بعد.</p>}</div>
    </section>
  </div>;
}
