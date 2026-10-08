import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext, roleCan } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { botSchemaReady, type StoredBot } from "../../../lib/whatsapp/bot-store";
import { botAiReady } from "../../../lib/whatsapp/bot-ai";
import { WorkspaceHeading, WorkspaceEmpty, WorkspaceMetric } from "../_components/workspace-ui";
import { BotEditor } from "./bot-editor";
import { resumeBotConversationAction } from "./actions";

export default async function BotsPage() {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const ready = await botSchemaReady(), canManage = roleCan(context.role, "automation.manage");
  const connections = await db.whatsAppConnection.findMany({ where: { businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null }, select: { id: true, displayPhoneNumber: true }, orderBy: { createdAt: "asc" } });
  const bots = ready ? await db.$queryRaw<StoredBot[]>(Prisma.sql`SELECT "connectionId","businessId",config,enabled,revision FROM "WhatsAppServiceBot" WHERE "businessId"=${context.businessId}`) : [];
  const handoffs = ready ? await db.$queryRaw<Array<{ conversationId: string; customerPhoneE164: string; createdAt: Date }>>(Prisma.sql`SELECT h."conversationId",c."customerPhoneE164",h."createdAt" FROM "WhatsAppBotHandoff" h JOIN "WhatsAppConversation" c ON c.id=h."conversationId" AND c."businessId"=h."businessId" WHERE h."businessId"=${context.businessId} AND h.active ORDER BY h."createdAt" DESC LIMIT 50`) : [];
  const counts = ready ? await db.$queryRaw<Array<{ total: number; failed: number; waiting: number }>>(Prisma.sql`SELECT count(*)::int AS total,count(*) FILTER (WHERE status='failed')::int AS failed,count(*) FILTER (WHERE status='processing')::int AS waiting FROM "WhatsAppBotTurn" WHERE "businessId"=${context.businessId} AND "createdAt">=date_trunc('day',CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`) : [];
  return <div className="wa-page" dir="rtl"><WorkspaceHeading eyebrow="خدمة العملاء" title="بوت المحادثات" description="مساعد لكل رقم، يجيب من معرفة منشأتك ويترك الحالات التي تحتاج متابعة لفريقك." action={<><Link className="wa-button" href="/dashboard/whatsapp/ai">متابعة الاستخدام والنشاط</Link><Link className="wa-button wa-secondary" href="/dashboard/whatsapp/inbox">صندوق المحادثات</Link></>}/>
    <section className="wa-metrics"><WorkspaceMetric label="بوتات تعمل" value={bots.filter(b => b.enabled).length}/><WorkspaceMetric label="معالجة اليوم" value={counts[0]?.total ?? 0}/><WorkspaceMetric label="تعذر الرد اليوم" value={counts[0]?.failed ?? 0}/><WorkspaceMetric label="قيد المعالجة" value={counts[0]?.waiting ?? 0}/></section>
    {!ready ? <p className="wa-notice">إعداد تخزين البوت لم يُطبق بعد. التشغيل والحفظ غير متاحين حتى اكتماله.</p> : null}
    {!connections.length ? <WorkspaceEmpty title="اربط رقم المنشأة أولًا" description="يعمل البوت على أرقام Meta المتصلة داخل منشأتك."/> : canManage ? <BotEditor connections={connections.map(c => ({ id: c.id, label: c.displayPhoneNumber ?? c.id }))} initial={bots} aiReady={botAiReady()} storageReady={ready}/> : <p className="wa-notice">إعداد البوت يتطلب صلاحية إدارة الأتمتة.</p>}
    <section className="wa-panel wa-stack"><h2>محادثات محالة إلى الفريق</h2><p className="wa-note">أحدث 50 محادثة محالة. الاستئناف يتيح الرد على الرسائل القادمة؛ المحادثة المسندة إلى موظف تبقى تحت إدارته.</p>{!handoffs.length ? <WorkspaceEmpty title="لا توجد محادثات محالة" description="تظهر هنا طلبات الموظف والأسئلة التي لا يملك البوت إجابتها."/> : handoffs.map(h => <div className="wa-block-row" key={h.conversationId}><Link className="wa-text-link" href={`/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(h.conversationId)}`}><span dir="ltr">{h.customerPhoneE164}</span></Link>{canManage ? <form action={resumeBotConversationAction}><input type="hidden" name="conversationId" value={h.conversationId}/><button className="wa-button wa-secondary">استئناف البوت للرسائل القادمة</button></form> : null}</div>)}</section>
  </div>;
}
