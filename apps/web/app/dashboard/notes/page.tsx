import { Prisma } from "@prisma/client";
import { ArrowDown, ArrowUp, FilePenLine, NotebookPen, Pin, PinOff, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { createBusinessNoteAction, deleteBusinessNoteAction, moveBusinessNoteAction, toggleBusinessNotePinAction, updateBusinessNoteAction } from "../../actions/business-notes";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { db } from "../../lib/db";
import { isBusinessNotesSchemaReady } from "../../lib/business-notes/schema-readiness";

type Note = { id: string; title: string; body: string; isPinned: boolean; sortOrder: number; updatedAt: Date };

function Notice({ params }: { params: Record<string, string | undefined> }) {
  const entry = Object.entries(params).find(([, value]) => value);
  if (!entry) return null;
  const success = entry[1] === "success";
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-bold ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{success ? "تم حفظ التغيير في مذكرات أعمالك." : "تعذر تنفيذ العملية. لم نغيّر أي مذكرة غير مؤكدة."}</div>;
}

function Pending() {
  return <div dir="rtl" className="space-y-6 pb-10"><header className="rounded-[28px] border border-slate-200 bg-[#07181b] p-6 text-white"><p className="text-[10px] font-black tracking-[.16em] text-[#4ee7d4]">INFRO BUSINESS MEMORY</p><h1 className="mt-3 text-2xl font-black">مذكرات الأعمال الذكية</h1></header><section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">المذكرات جاهزة في هذا الإصدار، لكن قاعدة بيانات هذه البيئة لم تُحدَّث بالمخطط الجديد بعد. لم يتم إنشاء أو حذف أي بيانات.</section></div>;
}

export default async function BusinessNotesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/dashboard?business=required");
  const params = await searchParams;
  if (!await isBusinessNotesSchemaReady()) return <Pending />;
  const notes = await db.$queryRaw<Note[]>(Prisma.sql`
    SELECT "id", "title", "body", "isPinned", "sortOrder", "updatedAt"
    FROM "BusinessNote" WHERE "businessId"=${business.id}
    ORDER BY "isPinned" DESC, "sortOrder" ASC, "updatedAt" DESC LIMIT 250
  `);

  return <div dir="rtl" className="space-y-6 pb-10">
    <header className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#07181b] p-6 text-white shadow-sm sm:p-7">
      <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#00d8c6]/15 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-[#4ee7d4]"><NotebookPen className="h-4 w-4"/>INFRO BUSINESS MEMORY</div><h1 className="text-2xl font-black sm:text-3xl">مذكرات الأعمال الذكية</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">مساحة ثابتة لأفكارك، قراراتك، مهامك وملاحظات العمل. ثبّت المهم، عدّل المحتوى ورتّب المذكرات كما يناسب يومك.</p></div><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-[#a8f2e8]"><ShieldCheck className="h-4 w-4"/>خاصة بالمنشأة النشطة</div></div>
    </header>
    <Notice params={params} />
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9fbf8] text-[#009d93]"><Plus className="h-5 w-5"/></div><div><h2 className="font-black text-slate-900">مذكرة جديدة</h2><p className="mt-1 text-xs text-slate-500">اكتب المعلومة مرة واحدة واحتفظ بها داخل مساحة عملك.</p></div></div><form action={createBusinessNoteAction} className="grid gap-3"><input name="title" required maxLength={160} placeholder="عنوان المذكرة" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#00bfae]"/><textarea name="body" required maxLength={8000} rows={5} placeholder="اكتب تفاصيل المذكرة..." className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-[#00bfae]"/><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="isPinned" className="h-4 w-4 accent-[#009d93]"/>تثبيت في الأعلى</label><button type="submit" className="rounded-xl bg-[#07181b] px-5 py-3 text-xs font-black text-white hover:bg-[#0c2a2e]">حفظ المذكرة</button></div></form></section>
    <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-black text-slate-900">مذكراتك</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">{notes.length} مذكرة</span></div>{notes.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">لا توجد مذكرات بعد. أضف أول مذكرة عمل من الأعلى.</div> : notes.map((note) => <article key={note.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2">{note.isPinned ? <Pin className="h-4 w-4 shrink-0 text-[#009d93]"/> : <FilePenLine className="h-4 w-4 shrink-0 text-slate-400"/>}<h3 className="truncate font-black text-slate-900">{note.title}</h3></div><span className="shrink-0 text-[10px] font-bold text-slate-400">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(note.updatedAt)}</span></div><form action={updateBusinessNoteAction} className="space-y-3"><input type="hidden" name="noteId" value={note.id}/><input name="title" required maxLength={160} defaultValue={note.title} aria-label="عنوان المذكرة" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#00bfae]"/><textarea name="body" required maxLength={8000} defaultValue={note.body} rows={4} aria-label="نص المذكرة" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm leading-7 outline-none focus:border-[#00bfae]"/><button type="submit" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:border-[#9fe8df]">حفظ التعديل</button></form><div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><form action={toggleBusinessNotePinAction}><input type="hidden" name="noteId" value={note.id}/><button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-[#e9fbf8] px-3 py-2 text-[11px] font-black text-[#007d76]">{note.isPinned ? <PinOff className="h-3.5 w-3.5"/> : <Pin className="h-3.5 w-3.5"/>}{note.isPinned ? "إلغاء التثبيت" : "تثبيت"}</button></form><form action={moveBusinessNoteAction}><input type="hidden" name="noteId" value={note.id}/><input type="hidden" name="direction" value="up"/><button type="submit" aria-label="تحريك المذكرة للأعلى" className="rounded-xl border border-slate-200 p-2 text-slate-600"><ArrowUp className="h-4 w-4"/></button></form><form action={moveBusinessNoteAction}><input type="hidden" name="noteId" value={note.id}/><input type="hidden" name="direction" value="down"/><button type="submit" aria-label="تحريك المذكرة للأسفل" className="rounded-xl border border-slate-200 p-2 text-slate-600"><ArrowDown className="h-4 w-4"/></button></form><form action={deleteBusinessNoteAction} className="mr-auto"><input type="hidden" name="noteId" value={note.id}/><button type="submit" className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-black text-rose-700"><Trash2 className="h-3.5 w-3.5"/>حذف</button></form></div></article>)}</section>
  </div>;
}
