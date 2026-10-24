"use client";
import { useActionState, useId } from "react";
import { inviteStaffAction, updateStaffAction, type StaffActionState } from "../../app/actions/staff";
import { STAFF_SECTIONS, staffSections } from "../../app/lib/staff-permissions";

const field = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900";
const button = "infro-workspace-action min-h-11 rounded-xl bg-[#07181b] px-5 text-sm font-bold text-white disabled:opacity-50";
function Feedback({ state }: { state: StaffActionState }) { return <>{state.error ? <p role="alert" className="text-sm text-rose-700">{state.error}</p> : null}{state.success ? <p role="status" className="text-sm text-emerald-700">{state.success}</p> : null}</>; }
const permissionDetails: Record<string, string> = {
  laundryAccounting: "القيود المالية والاشتراكات وحسابات الموردين.", laundryOperations: "متابعة العملاء وإدارة المخزون والتشغيل.",
  laundryDelivery: "الوصول إلى مهام التوصيل المسندة للموظف فقط.", laundry: "إنشاء الطلبات وتسجيل التحصيل في نقطة البيع.",
  liveView: "إدارة المحطات وجلسات مشاهدة العملاء المصرح بها.", page: "تحرير محتوى المنشأة وخدماتها وفروعها.",
  identity: "إدارة بيانات الهوية الرقمية وطلبات التوثيق.", orders: "متابعة الطلبات الواردة للمنشأة.",
  appointments: "متابعة المواعيد وإعداد أيام وأوقات الحجز.", whatsapp: "تحدَّد مهام واتساب بالمستوى المختار أدناه.",
  reminders: "إدارة التذكيرات المرتبطة بأعمال المنشأة.", notifications: "الاطلاع على إشعارات مساحة العمل.",
  notes: "إدارة مذكرات الأعمال ومتابعاتها.", store: "إدارة متجر أعمال المنشأة.",
  analytics: "الاطلاع على تقارير الأداء المتاحة.", support: "متابعة طلبات الدعم والمساعدة.",
};
function Permissions({ selected = [] }: { selected?: unknown }) {
  const permitted = staffSections(selected), prefix = useId();
  return <fieldset className="infro-permissions"><legend>الأقسام المتاحة للموظف</legend><p className="infro-staff-description">اختر الأقسام اللازمة لمهام الموظف. ترك القسم دون تحديد يمنع الوصول إليه.</p><div className="grid gap-3 sm:grid-cols-2">{Object.entries(STAFF_SECTIONS).map(([value, section]) => <label key={value} className="infro-permission-choice"><input className="h-4 w-4 accent-teal-700" aria-label={section.label} aria-describedby={`${prefix}-${value}`} name="permissions" type="checkbox" value={value} defaultChecked={permitted.includes(value as keyof typeof STAFF_SECTIONS)} /><span><b>{section.label}</b><small id={`${prefix}-${value}`}>{permissionDetails[value]}</small></span></label>)}</div><p className="infro-staff-note">إدارة الموظفين والفوترة وحذف المنشأة للمالك فقط. يستطيع الموظف تعديل بيانات حسابه الشخصي.</p></fieldset>;
}
function Role({ value = "viewer" }: { value?: string }) { return <label className="block text-sm font-bold">مستوى العمل داخل واتساب<select name="role" defaultValue={value} className={field}><option value="viewer">عرض فقط</option><option value="support">خدمة العملاء والردود</option><option value="marketer">التسويق والحملات والأتمتة</option><option value="admin">إدارة واتساب كاملة</option></select><span className="mt-1 block text-xs font-normal leading-6 text-slate-500">يسري فقط إذا كان قسم واتساب متاحًا.</span></label>; }
export function InviteStaffForm() {
  const [state, action, pending] = useActionState(inviteStaffAction, {});
  return <form action={action} className="space-y-4"><fieldset disabled={pending} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">اسم الموظف<input className={field} name="name" required minLength={2} maxLength={100} autoComplete="off" placeholder="الاسم الذي سيظهر في فريق العمل" /></label><label className="text-sm font-bold">بريد الموظف<input className={field} name="email" type="email" dir="ltr" required maxLength={254} autoComplete="off" placeholder="employee@example.com" /></label></div><Permissions /><Role /><button className={button} disabled={pending}>{pending ? "جارٍ إنشاء الدعوة…" : "إضافة موظف وإرسال الدعوة"}</button></fieldset><Feedback state={state} />{state.inviteUrl ? <label className="block text-sm font-bold">رابط دعوة الموظف<input aria-label="رابط دعوة الموظف" className={field} readOnly dir="ltr" value={state.inviteUrl} onFocus={event => event.target.select()} /></label> : null}</form>;
}
export function StaffMemberForm({ member }: { member: { id: string; name: string; email: string; status: string; role: string; permissions: unknown } }) {
  const [state, action, pending] = useActionState(updateStaffAction, {});
  return <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-black">{member.name} <span className="mr-2 text-xs font-normal text-slate-500">{member.status === "active" ? "نشط" : member.status === "suspended" ? "موقوف مؤقتًا" : "ملغى الوصول"}</span></summary><p dir="ltr" className="my-3 break-all text-sm text-slate-500">{member.email}</p><form action={action} className="space-y-4"><input type="hidden" name="memberId" value={member.id} /><fieldset disabled={pending} className="space-y-4"><Permissions selected={member.permissions ?? ["whatsapp"]} /><Role value={member.role} /><label className="block text-sm font-bold">حالة وصول الموظف<select name="status" defaultValue={member.status} className={field}><option value="active">نشط</option><option value="suspended">إيقاف مؤقت</option><option value="revoked">إلغاء الوصول</option></select></label><button disabled={pending} className={button}>{pending ? "جارٍ الحفظ…" : "حفظ صلاحيات الموظف"}</button></fieldset><Feedback state={state} /></form></details>;
}
