import { Clock3, Flag, UserRound } from "lucide-react";
import { updateWhatsAppConversationCareAction } from "../../../actions/whatsapp";
import { WHATSAPP_CARE_PRIORITIES } from "../../../lib/whatsapp/care-domain";

const priorityLabel = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" } as const;
const roleLabel: Record<string, string> = { owner: "مالك المنشأة", admin: "مسؤول", support: "خدمة العملاء" };
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" }).format(value) : "—";

export function InboxCareControls({ conversation, assignees, canManage, outcome }: {
  conversation: { id: string; assignedToUserId: string | null; assignee: { id: string; name: string } | null; priority: string; sla: { state: "answered" | "not-started" | "overdue" | "running"; dueAt: Date | null; overdue: boolean } };
  assignees: Array<{ id: string; name: string; role: string }>;
  canManage: boolean;
  outcome?: string;
}) {
  const slaText = conversation.sla.state === "overdue" ? `متأخرة منذ ${date(conversation.sla.dueAt)}` : conversation.sla.state === "running" ? `مهلة الاستجابة حتى ${date(conversation.sla.dueAt)}` : conversation.sla.state === "answered" ? "تمت الاستجابة لآخر وارد" : "تبدأ المهلة عند وصول رسالة";
  return <section aria-label="إدارة خدمة المحادثة" className="border-b border-slate-200 bg-[#fbfdfd] p-4">
    {outcome ? <p role={outcome === "updated" ? "status" : "alert"} className={`mb-3 rounded-xl px-3 py-2 text-xs font-bold ${outcome === "updated" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{outcome === "updated" ? "تم تحديث مسؤول المحادثة وأولويتها." : "تعذر تحديث بيانات المتابعة. أعد المحاولة."}</p> : null}
    <div className="flex flex-wrap gap-2 text-[10px]">
      <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700"><UserRound className="h-3.5 w-3.5 text-[#008f87]" />{conversation.assignee?.name ?? "غير معيّنة"}</span>
      <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700"><Flag className="h-3.5 w-3.5 text-[#008f87]" />{priorityLabel[conversation.priority as keyof typeof priorityLabel] ?? "عادية"}</span>
      <span className={`inline-flex min-h-9 items-center gap-2 rounded-xl px-3 font-bold ${conversation.sla.overdue ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}><Clock3 className="h-3.5 w-3.5" />{slaText}</span>
    </div>
    {canManage ? <form action={updateWhatsAppConversationCareAction} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_auto]">
      <input type="hidden" name="conversationId" value={conversation.id} />
      <label className="grid gap-1 text-[10px] font-bold text-slate-600"><span>الموظف المسؤول</span><select name="assignedToUserId" defaultValue={conversation.assignedToUserId ?? ""} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#00a99d] focus:ring-2 focus:ring-[#35e4cb]/10"><option value="">غير معيّنة</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name} · {roleLabel[assignee.role] ?? assignee.role}</option>)}</select></label>
      <label className="grid gap-1 text-[10px] font-bold text-slate-600"><span>الأولوية</span><select name="priority" defaultValue={conversation.priority} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#00a99d] focus:ring-2 focus:ring-[#35e4cb]/10">{WHATSAPP_CARE_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priorityLabel[priority]}</option>)}</select></label>
      <button className="min-h-11 self-end rounded-xl bg-[#07181b] px-4 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2">حفظ المتابعة</button>
    </form> : <p className="mt-3 text-[10px] text-slate-500">يمكنك مشاهدة مسؤول المحادثة والأولوية وSLA. يحتاج التعديل إلى صلاحية إدارة صندوق المحادثات.</p>}
    <p className="mt-2 text-[9px] leading-5 text-slate-500">أهداف الاستجابة: عاجلة 15 دقيقة، عالية ساعة، عادية 4 ساعات، منخفضة 8 ساعات. تبدأ من آخر رسالة واردة تنتظر ردًا.</p>
  </section>;
}
