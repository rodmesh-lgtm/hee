import { HistoryPagination } from "../../../components/dashboard/history-pagination";
import { HISTORY_PAGE_SIZE, historyPage, historyQuery, historyHref } from "../../lib/history-navigation";
import { Bell, BellRing, CheckCheck, Clock3, Inbox } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { markAllReminderNotificationsReadAction, markReminderNotificationReadAction } from "../../actions/reminder-notifications";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { isSmartRemindersSchemaReady } from "../../lib/reminders/schema-readiness";
import { Prisma } from "@prisma/client";

type NotificationRow = { id:string; reminderId:string; title:string; body:string; occurredAt:Date; readAt:Date|null; createdAt:Date };

function dateText(value: Date) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(value);
}

function SchemaPending() {
  return <div dir="rtl" className="space-y-6 pb-10" data-notification-schema="pending"><header className="rounded-[28px] bg-[#07181b] p-6 text-white"><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-[#4ee7d4]"><Bell className="h-4 w-4"/>INFRO NOTIFICATIONS</div><h1 className="text-2xl font-black">مركز الإشعارات</h1><p className="mt-2 text-sm text-slate-300">بيئة المعاينة لم تُحدّث بعد بمخطط الإشعارات الجديد.</p></header></div>;
}

export default async function ReminderNotificationsPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/dashboard?business=required");
  if (!await isSmartRemindersSchemaReady()) return <SchemaPending />;
  const params = await searchParams;
  const tab = ["unread","read"].includes(params.tab??"") ? params.tab! : "all";
  const q=historyQuery(params);
  const tenant=Prisma.sql`"businessId"=${business.id} AND "userId"=${user.id}`;
  const filter=Prisma.sql`(${tab}='all' OR (${tab}='unread' AND "readAt" IS NULL) OR (${tab}='read' AND "readAt" IS NOT NULL)) AND
    (${q}='' OR POSITION(LOWER(${q}) IN LOWER("title"))>0 OR POSITION(LOWER(${q}) IN LOWER("body"))>0)`;
  const {rows,unreadCount,total,matching,page,pages}=await db.$transaction(async tx=>{
    const [stats]=await tx.$queryRaw<Array<{total:bigint;unread:bigint;matching:bigint}>>(Prisma.sql`
      SELECT COUNT(*) AS total,COUNT(*) FILTER (WHERE "readAt" IS NULL) AS unread,COUNT(*) FILTER (WHERE ${filter}) AS matching
      FROM "SmartReminderNotification" WHERE ${tenant}`);
    const matching=Number(stats.matching),{page,pages}=historyPage(params.page,matching);
    const rows=await tx.$queryRaw<NotificationRow[]>(Prisma.sql`
      SELECT "id","reminderId","title","body","occurredAt","readAt","createdAt" FROM "SmartReminderNotification"
      WHERE ${tenant} AND ${filter} ORDER BY "createdAt" DESC,"id" DESC LIMIT ${HISTORY_PAGE_SIZE} OFFSET ${(page-1)*HISTORY_PAGE_SIZE}`);
    return {rows,total:Number(stats.total),unreadCount:Number(stats.unread),matching,page,pages};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});

  return <div dir="rtl" className="space-y-6 pb-10">
    <header className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#07181b] p-6 text-white shadow-sm sm:p-7"><div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#00d8c6]/15 blur-3xl"/><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-[#4ee7d4]"><Bell className="h-4 w-4"/>INFRO NOTIFICATIONS</div><h1 className="text-2xl font-black sm:text-3xl">مركز الإشعارات</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">راجع تنبيهات أعمالك وابحث في سجل الإشعارات المقروءة والجديدة، ضمن منشأتك وحسابك.</p></div><Link href="/dashboard/reminders" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black text-[#a8f2e8]"><BellRing className="h-4 w-4"/>إدارة التذكيرات</Link></div></header>

    {(params.read === "success" || params.readAll === "success") ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">تم تحديث حالة الإشعارات.</div> : null}

    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><Bell className="h-5 w-5 text-[#009d93]"/><p className="mt-3 text-xs font-black text-slate-500">غير مقروءة</p><p className="mt-1 text-2xl font-black text-slate-900">{unreadCount}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><Inbox className="h-5 w-5 text-[#009d93]"/><p className="mt-3 text-xs font-black text-slate-500">كل الإشعارات</p><p className="mt-1 text-2xl font-black text-slate-900">{total}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><CheckCheck className="h-5 w-5 text-[#009d93]"/><p className="mt-3 text-xs font-black text-slate-500">مقروءة</p><p className="mt-1 text-sm font-black text-slate-900">{total-unreadCount}</p></div></section>

    <section id="history" className="scroll-mt-24 space-y-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-black text-slate-900">سجل الإشعارات</h2>
      <form method="get" action="/dashboard/notifications#history" className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="tab" value={tab}/><input type="search" name="q" aria-label="البحث في الإشعارات" placeholder="ابحث في عنوان الإشعار أو تفاصيله" maxLength={120} defaultValue={q} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm"/>
        <button className="min-h-11 rounded-xl bg-[#07181b] px-5 text-xs font-black text-white">بحث</button><Link href="/dashboard/notifications#history" className="inline-flex min-h-11 items-center justify-center px-3 text-xs font-bold text-[#008f87]">مسح البحث والتصفية</Link>
      </form>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><nav className="grid grid-cols-3 gap-2" aria-label="تصفية الإشعارات">{[["all","الكل"],["unread","غير المقروءة"],["read","المقروءة"]].map(([key,label])=><Link key={key} href={historyHref("/dashboard/notifications",{q,tab:key})} aria-current={tab===key?"page":undefined} className={`rounded-xl px-3 py-3 text-center text-xs font-black ${tab===key?"bg-[#07181b] text-white":"text-slate-500 hover:bg-slate-50"}`}>{label}</Link>)}</nav>{unreadCount>0?<form action={markAllReminderNotificationsReadAction}><input type="hidden" name="historyQuery" value={q}/><input type="hidden" name="historyTab" value={tab}/><input type="hidden" name="historyPage" value={page}/><button className="min-h-11 w-full rounded-xl border border-slate-200 px-4 text-xs font-black text-[#008f87]">تحديد الكل كمقروء</button></form>:null}</div>
    </section>

    <section className="space-y-3">{rows.map((notification) => <article key={notification.id} className={`rounded-[24px] border bg-white p-5 shadow-sm ${notification.readAt ? "border-slate-200" : "border-[#a7e8e0] ring-2 ring-[#00aa9f]/5"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-900">{notification.title}</h2>{notification.readAt ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">مقروء</span> : <span className="rounded-full bg-[#e9fbf8] px-2.5 py-1 text-[10px] font-black text-[#007f78]">جديد</span>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{notification.body}</p><p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400"><Clock3 className="h-3.5 w-3.5"/>{dateText(notification.occurredAt)}</p></div>{!notification.readAt ? <form action={markReminderNotificationReadAction} className="shrink-0"><input type="hidden" name="historyQuery" value={q}/><input type="hidden" name="historyTab" value={tab}/><input type="hidden" name="historyPage" value={page}/><input type="hidden" name="notificationId" value={notification.id}/><button className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-black text-[#008f87]">تحديد كمقروء</button></form> : null}</div></article>)}{!rows.length ? <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-14 text-center"><Bell className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-sm font-black text-slate-700">لا توجد إشعارات هنا</p><p className="mt-1 text-xs text-slate-400">جرّب مسح البحث أو تغيير حالة القراءة؛ تظهر التنبيهات هنا عند وصولها.</p></div> : null}</section>
    <HistoryPagination path="/dashboard/notifications" filters={{q,tab}} page={page} pages={pages} matching={matching}/>
  </div>;
}
